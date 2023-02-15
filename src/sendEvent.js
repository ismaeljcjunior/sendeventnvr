const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const express = require("express")
const { XMLParser, XMLBuilder, XMLValidator } = require("fast-xml-parser")
const fs = require("fs")
const dbMysql = require("./config/dbMysql")
const { QueryTypes } = require("sequelize")
const logger = require("./utils/logger")
const expressPinoLogger = require("express-pino-logger")
const nodeSchedule = require("node-schedule")
const axios = require("axios")

const loggerMidleware = expressPinoLogger({
  logger: logger,
  autoLogging: true,
})
const app = express()
app.use(express.json())
app.use(loggerMidleware)

async function selectEvent() {
  let date = new Date()
  let localDate = date.toLocaleString()
  let eventNVR = false
  let regExpTexto = /[^\d']/
  let regExpNumero = /[0-9]/g
  let verifyIdEmp
  let verifyIdEvent
  let verifyIdTipoEvento
  
  try {
    const checkEvent = await dbMysql.query(process.env.DB_VERIFY_EVENT, { type: dbMysql.QueryTypes.SELECT,})

    verifyIdEvent = checkEvent.at(0).ID_EVENTO
    verifyIdEmp = checkEvent.at(0).ID_EMPRESA
    verifyIdCsid = checkEvent.at(0).CSID
    verifyIdParticao = checkEvent.at(0).PARTICAO
    verifyIdTipoEvento = checkEvent.at(0).TIPO_EVENTO
    

    if ( regExpTexto.test(verifyIdEmp) || regExpTexto.test(verifyIdCsid) || regExpTexto.test(verifyIdParticao) ||regExpNumero.test(verifyIdTipoEvento) ) {
      try {
        console.log("EVENTO COM DADOS INVALIDOS",checkEvent.at(0).EMAIL_SUBJECT )
        logger.info("EVENTO COM DADOS INVALIDOS",  checkEvent.at(0).EMAIL_SUBJECT)
        console.log("ATUALIZANDO STATUS PARA INVALIDO")

        await dbMysql.query( `UPDATE evento_nvr_dvr.db_evento SET STATUS = 'INVALIDO' WHERE (ID_EVENTO = '${verifyIdEvent}')`, { type: dbMysql.QueryTypes.UPDATE } )
        return
      } catch (e) {
        console.log("ERRO AO ATUALIZAR STATUS PARA INVALIDO", e)
        logger.info("ERRO AO ATUALIZAR STATUS PARA INVALIDO", e)
      }
    }
    if (checkEvent.length === 0) {
      console.log("NENHUM EVENTO PENDENTE", localDate)
      return logger.info("NENHUM EVENTO PENDENTE", localDate)
    }
    if (checkEvent.length > 0) {
      eventNVR = true
      console.log(
        `EVENTO COM STATUS PENDENTE, QUANTIDADE: ${checkEvent.length} DATA: ${localDate}`
      )
      logger.info(
        `EVENTO COM STATUS PENDENTE, QUANTIDADE: ${checkEvent.length} DATA: ${localDate}`
      )

      mountEvent(eventNVR, verifyIdEvent)
    }
  } catch (e) {
    console.log("NENHUM EVENTO PENDENTE DATA: ", localDate)
    logger.info("NENHUM EVENTO PENDENTE DATA: ", localDate)
  }
}
async function mountEvent(eventNVR, verifyIdEvent) {
  let date = new Date()
  let localDate = date.toLocaleString()
  let checkEvent
  let objectEvent = {
    ID_EVENTO: "",
    CSID: "",
    PARTICAO: "",
    ID_EMPRESA: "",
    TIPO_EVENTO: "",
    CHANNEL: "",
    DT_CREATED: "",
  }

  if (eventNVR) {
    console.log("MONTANDO EVENTO", date)
    logger.info("MONTANDO EVENTO", date)
    try {
      checkEvent = await dbMysql.query(`SELECT * FROM evento_nvr_dvr.db_evento  where id_evento = '${verifyIdEvent}'`, { type: dbMysql.QueryTypes.SELECT } )
      // console.log(checkEvent)
      objectEvent.ID_EVENTO = checkEvent.at(0).ID_EVENTO
      objectEvent.CSID = checkEvent.at(0).CSID
      objectEvent.PARTICAO = checkEvent.at(0).PARTICAO
      objectEvent.ID_EMPRESA = checkEvent.at(0).ID_EMPRESA
      objectEvent.TIPO_EVENTO = checkEvent.at(0).TIPO_EVENTO
      objectEvent.CHANNEL = checkEvent.at(0).CHANNEL
      objectEvent.DT_CREATED = checkEvent.at(0).DT_CREATED
      
    } catch (e) {
      console.log("error select query", e)
    }
  } else {
    return
  }
  if (objectEvent.TIPO_EVENTO === "HDD ERROR") {
    console.log("EVENTO SELECIONADO HDD ERROR")
    

  }
  else if (objectEvent.TIPO_EVENTO === "VIDEO SIGNAL LOST") {
    console.log("EVENTO SELECIONADO VIDEO SIGNAL LOST")


  }
  else if (objectEvent.TIPO_EVENTO === "RECORD EXCEPTION") {
    console.log("EVENTO SELECIONADO RECORD EXCEPTION")


  }
  buildXml(objectEvent)
}
function buildXml( objectEvent) {
  let date = new Date()
  let localDate = date.toLocaleString()
  let auxiliar = '000'
  let codigo = 'E602'
  let descricaoReceptora = 'PORTAL_SWS'
  let protocolo = '2'
  const xmlDataBase =
  `
  <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <SOAP-ENV:Body>
    <m:receberEvento xmlns:m="http://webServices.sigmaWebServices.segware.com.br/">
      <evento>
        <auxiliar>001</auxiliar>
          <codigo>E130</codigo>
          <data>2022-11-29T09:30:47Z</data>
          <descricaoReceptora>Receptora de teste</descricaoReceptora>
          <empresa>10001</empresa>
          <idCentral>57571</idCentral>
          <particao>001</particao>
          <protocolo>2</protocolo>
        </evento>
      </m:receberEvento>
  </SOAP-ENV:Body>
  </SOAP-ENV:Envelope>
  `
  const optionsToJson = {
    attributeNamePrefix: "@_",
    //attrNodeName: false,
    //textNodeName : "#text",
    ignoreAttributes: false,
    ignoreNameSpace: false,
  }
   
  const parser = new XMLParser(optionsToJson)
  const xmlJson = parser.parse(xmlDataBase)
  // console.log('----->',  objectEvent)
  try {
    //console.log('antes', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].auxiliar =  auxiliar
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].codigo =  codigo
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].data =  objectEvent.DT_CREATED
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].descricaoReceptora =  descricaoReceptora
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].empresa =   objectEvent.ID_EMPRESA
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].idCentral =   objectEvent.CSID
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].identificadorCliente = ''
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].particao =   objectEvent.PARTICAO
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].protocolo = protocolo
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].tipoIntegracao = '1'

    //  console.log('depois', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])
     console.log("XML EVENTO", date)
     logger.info("XML EVENTO", date)
    } catch (e) {
    console.log("ERRO MONTAR XML DO EVENTO", e)
    logger.info("ERRO MONTAR XML DO EVENTO", e)
  }
  const optionsToXML = {
    attributeNamePrefix: "@_",
    //attrNodeName: false,
    //textNodeName : "#text",
    ignoreAttributes: false,
    ignoreNameSpace: false,
    //format: true,
    //indentBy: "  ",
    //supressEmptyNode: false,
  }
  const builder = new XMLBuilder(optionsToXML)
  let xmlDataStr = builder.build(xmlJson)
  // console.log(xmlDataStr)
  console.log("BUILD XML", date)
  logger.info("BUILD XML", date)

  sendEvent(xmlDataStr, objectEvent)
}
async function sendEvent(xmlDataStr, objectEvent) {
  let date = new Date()
  let localDate = date.toLocaleString()
  let config = { headers: { "Content-Type": "text/xml" } }
  let url = process.env.URL_EVENT
  let statusError = false
  let returnDataXML


  try {
    // const response = await axios.post(url, xmlDataStr, config)
    //   .then(res => {
    //     returnDataXML = res.data
    //     //console.log(returnDataXML, 'debug')
    //   })
    //   .catch(e => {
    //     console.log(e)
    //   })
    // if (returnDataXML.includes('ACK')) {
    //   console.log('return ACK')
    //   console.log('----------------->',returnDataXML)
    //   // updateStatusEvent(idError)
    // } else {
    //   console.log('error ', returnDataXML)
    // }

    updateStatusEvent(objectEvent)
    console.log('EVENTO ENVIADO', date)
    logger.info('EVENTO ENVIADO', date)
  } catch (e) {
    console.log(e)
  }
}
async function updateStatusEvent(objectEvent) {
  let date = new Date()
  let localDate = date.toLocaleString()

  try {
    await dbMysql.query(`UPDATE db_evento SET STATUS = 'ENVIADO', DT_ENVIADO = '${localDate}' WHERE (ID_EVENTO = '${objectEvent.ID_EVENTO}')`, { type: dbMysql.QueryTypes.UPDATE }  )
  } catch (e) {
    console.log("ERRO AO ATUALIZAR EVENTO", e)
    console.log("ERRO AO ATUALIZAR EVENTO", e)
    return
  }

}
function debug() {
  console.log("debug")
  // process.env.BD_SELECT
  // try {
  //   event = await dbMysql.query(process.env.BD_SELECT, { type: dbMysql.QueryTypes.SELECT })
  //   console.log(event)
  // } catch (e) {
  //   console.log(e)
  // }
}
//---------------Scheduled------------------//
const job = nodeSchedule.scheduleJob("0-59/5  * * * * *", () => {
  let date = new Date()
  let localDate = date.toLocaleString()
  logger.info("sendEvent is running...", localDate)
  console.log("sendEvent is running...", localDate)
  selectEvent()
})
//---------------Status Server------------------//
app.get("/", function (req, res) {
  res.json("sendEvent is running 1.0")
})
app.listen(process.env.PORT, function () {
  console.log(`Server is listening on PORT:${process.env.PORT}`)
  logger.info(`Server is listening on PORT:${process.env.PORT}`)
})