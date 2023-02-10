const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const express = require("express")
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser')
const fs = require('fs')
const dbMysql = require('./config/dbMysql')
const { QueryTypes } = require('sequelize')
const logger = require('./utils/logger')
const nodeSchedule = require('node-schedule')
const axios = require('axios')
const { Console } = require('console')
const app = express()

app.use(express.json())

async function selectEvent() {
  let date = new Date()
  let localDate = date.toLocaleString()
  let eventNVR = false
  let regExp = /[a-zA-Z]/g
  let verifyIdEmp
  let verifyIdEvent
  try {
    event = await dbMysql.query(process.env.DB_VERIFY_EVENT, { type: dbMysql.QueryTypes.SELECT })

    verifyIdEmp = event.at(0).ID_EMPRESA
    verifyIdEvent = event.at(0).ID_EVENTO

    if (regExp.test(verifyIdEmp)) {
      try {
        await dbMysql.query(`UPDATE eventos_dvr.events SET STATUS_ = 'INVALIDO' WHERE (ID_EVENTO = '${verifyIdEvent}');`, { type: dbMysql.QueryTypes.UPDATE })
        return console.log('evento com dados invalidos')
      } catch (e) {
        console.log('error updating invalid event', e)
      }
    }
    if (event.length === 0) {
      return console.log('no pending event', localDate)
    }
    if (event.length > 0) {
      eventNVR = true
      console.log('pending event', localDate)
      mountEvent(eventNVR)
    }
  } catch (e) {
    console.log('no events to handle')
  }
}
async function mountEvent(eventNVR) {
  let date = new Date()
  let localDate = date.toLocaleString()
  //Variaveis para montar, desestruturar select 
  let idError
  let csidError
  let partition
  let idEmp
  let eventError
  let channelError
  let dateError

  console.log('eventNVR', eventNVR)
  if (eventNVR) {
    console.log('mounting error', date)

    try {
      event = await dbMysql.query(process.env.DB_SELECT_EVENT, { type: dbMysql.QueryTypes.SELECT })

      idError = event.at(0).ID_EVENTO
      csidError = event.at(0).CSID
      partition = event.at(0).PARTITION_
      idEmp = event.at(0).ID_EMPRESA
      eventError = event.at(0).EVENT_TYPE
      channelError = event.at(0).CHANNEL_
      if (channelError == null) {

      } else {
        let testQuantChannel = channelError.split(',')
        if (testQuantChannel.length > 1) {
          channelError = '00'
        }
      }

      dateError = event.at(0).DT_CREATED
    } catch (e) {
      console.log('error select query', e)
    }
  }
  console.log('idError', idError)
  console.log('csidError', csidError)
  console.log('partition', partition)
  console.log('idEmp', idEmp)
  console.log('eventError', eventError)
  console.log('channelError', channelError)
  console.log('dateError', dateError)
  console.log('mount success', date)
  buildXml(eventNVR, idError, csidError, partition, idEmp, eventError, channelError, dateError)

}
function buildXml(eventNVR, idError, csidError, partition, idEmp, eventError, channelError, dateError) {
  let date = new Date()
  let localDate = date.toLocaleString()
  const xmlDataBase = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
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
  </SOAP-ENV:Envelope>`
  const optionsToJson = {
    attributeNamePrefix: "@_",
    //attrNodeName: false,
    //textNodeName : "#text",
    ignoreAttributes: false,
    ignoreNameSpace: false,
  };
  const parser = new XMLParser(optionsToJson)
  const xmlJson = parser.parse(xmlDataBase)

  try {
    //console.log('antes', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])

    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].auxiliar = '000'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].codigo = 'E602'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].data = '2022-11-29T09:30:47Z'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].descricaoReceptora = 'PORTAL_SWS'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].empresa = '10017'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].idCentral = '0496'
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].identificadorCliente = ''
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].particao = '001'
    xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].protocolo = '2'
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].tipoIntegracao = '1'

    //console.log('depois', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])

  } catch (e) {
    console.log('error build xmlEvent', e)
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
  };
  const builder = new XMLBuilder(optionsToXML)
  let xmlDataStr = builder.build(xmlJson)
  //console.log(xmlDataStr)

  console.log('build xml', date)

  sendEvent(xmlDataStr, idError)
}
async function sendEvent(xmlDataStr, idError) {
  let date = new Date()
  let localDate = date.toLocaleString()
  let config = { headers: { 'Content-Type': 'text/xml' } }
  let url = process.env.URL_EVENT
  let statusError = false
  let returnDataXML
  console.log('idError', idError)

  // try {
  //   const response = await axios.post(url, xmlDataStr, config)
  //     .then(res => {
  //       returnDataXML = res.data
  //       //console.log(returnDataXML, 'debug')
  //     })
  //     .catch(e => {
  //       console.log(e)
  //     })
  //   if (returnDataXML.includes('ACK')) {
  //     console.log('return ACK')
  //     updateStatusEvent(idError)
  //   } else {
  //     console.log('error ', returnDataXML)
  //   }

  //   console.log('send event', date)
  // } catch (e) {
  //   console.log(e)
  // }
}
async function updateStatusEvent(idError) {
  let date = new Date()
  let localDate = date.toLocaleString()

  try {
    await dbMysql.query(`UPDATE eventos_dvr.events SET STATUS_ = 'ENVIADO', DT_SEND = '${localDate}' WHERE (ID_EVENTO = '${idError}');`, { type: dbMysql.QueryTypes.UPDATE })
  } catch (e) {
    console.log('error update status event', e)
    return
  }
  console.log('updateStatusEvent', date)
}
function debug() {
  console.log('debug')
  // process.env.BD_SELECT
  // try {
  //   event = await dbMysql.query(process.env.BD_SELECT, { type: dbMysql.QueryTypes.SELECT })
  //   console.log(event)
  // } catch (e) {
  //   console.log(e)
  // }
}
//---------------Scheduled------------------//
const job = nodeSchedule.scheduleJob('0-59/5  * * * * *', () => {
  let date = new Date()
  let localDate = date.toLocaleString()
  selectEvent()
  //logger.info('sendEvent is running...', localDate)
})
//---------------Status Server------------------//
app.get('/', function (req, res) {

  res.json('sendEvent is running 1.0')
})
app.listen(process.env.PORT, function () {
  console.log(`Server is listening on PORT:${process.env.PORT}`)
})