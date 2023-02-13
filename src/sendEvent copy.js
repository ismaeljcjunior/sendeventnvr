const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const { XMLParser, XMLBuilder, XMLValidator } = require("fast-xml-parser");
const fs = require("fs");
const dbMysql = require("./config/dbMysql");
const { QueryTypes } = require("sequelize");
const logger = require("./utils/logger");
const expressPinoLogger = require("express-pino-logger");
const nodeSchedule = require("node-schedule");
const axios = require("axios");

const loggerMidleware = expressPinoLogger({
  logger: logger,
  autoLogging: true,
});
const app = express();
app.use(express.json());
app.use(loggerMidleware);

async function selectEvent() {
  let date = new Date();
  let localDate = date.toLocaleString();
  let eventNVR = false;
  let regExpTexto = /[^\d']/;
  let regExpNumero = /[0-9]/g;
  let verifyIdEmp;
  let verifyIdEvent;

  try {
    const checkEvent = await dbMysql.query(process.env.DB_VERIFY_EVENT, {  type: dbMysql.QueryTypes.SELECT, });
   
    verifyIdEvent = checkEvent.at(0).ID_EVENTO;
    verifyIdEmp = checkEvent.at(0).ID_EMPRESA;
    verifyIdCsid = checkEvent.at(0).CSID;
    verifyIdParticao = checkEvent.at(0).PARTICAO;
    verifyIdTipoEvento = checkEvent.at(0).TIPO_EVENTO;
    // console.log(checkEvent);
    
    if (regExpTexto.test(verifyIdEmp) || regExpTexto.test(verifyIdCsid) || regExpTexto.test(verifyIdParticao) || regExpNumero.test(verifyIdTipoEvento)) {
      try {
        console.log("EVENTO COM DADOS INVALIDOS", checkEvent.at(0).EMAIL_SUBJECT);
        logger.info("EVENTO COM DADOS INVALIDOS", checkEvent.at(0).EMAIL_SUBJECT);
        console.log("ATUALIZANDO STATUS PARA INVALIDO"); 
        await dbMysql.query(`UPDATE evento_nvr_dvr.db_evento SET STATUS = 'INVALIDO' WHERE (ID_EVENTO = '${verifyIdEvent}');`, { type: dbMysql.QueryTypes.UPDATE } );
        return 
      } catch (e) {
        console.log("ERRO AO ATUALIZAR STATUS PARA INVALIDO", e);
        logger.info("ERRO AO ATUALIZAR STATUS PARA INVALIDO", e);
      }
    }
    if (checkEvent.length === 0) {
      console.log("NENHUM EVENTO PENDENTE", localDate);
      return logger.info("NENHUM EVENTO PENDENTE", localDate);
    }
    if (checkEvent.length > 0) {
      eventNVR = true;
      console.log(`EVENTO COM STATUS PENDENTE, QUANTIDADE: ${checkEvent.length} DATA: ${localDate}`);
      logger.info(`EVENTO COM STATUS PENDENTE, QUANTIDADE: ${checkEvent.length} DATA: ${localDate}`)
      // mountEvent(eventNVR)
    }
  } catch (e) {
    console.log("NENHUM EVENTO PENDENTE DATA: ", localDate);
    logger.info("NENHUM EVENTO PENDENTE DATA: ", localDate);
  }
}
async function mountEvent(eventNVR) {
  let date = new Date();
  let localDate = date.toLocaleString();
  //Variaveis para montar, desestruturar select
  let idError;
  let csidError;
  let partition;
  let idEmp;
  let eventError;
  let channelError;
  let dateError;

  console.log("eventNVR", eventNVR);
  if (eventNVR) {
    console.log("mounting error", date);

    try {
      event = await dbMysql.query(process.env.DB_SELECT_EVENT, {
        type: dbMysql.QueryTypes.SELECT,
      });

      idError = event.at(0).ID_EVENTO;
      csidError = event.at(0).CSID;
      partition = event.at(0).PARTITION_;
      idEmp = event.at(0).ID_EMPRESA;
      eventError = event.at(0).EVENT_TYPE;
      channelError = event.at(0).CHANNEL_;
      if (channelError == null) {
      } else {
        let testQuantChannel = channelError.split(",");
        if (testQuantChannel.length > 1) {
          channelError = "00";
        }
      }

      dateError = event.at(0).DT_CREATED;
    } catch (e) {
      console.log("error select query", e);
    }
  }
  console.log("idError", idError);
  console.log("csidError", csidError);
  console.log("partition", partition);
  console.log("idEmp", idEmp);
  console.log("eventError", eventError);
  console.log("channelError", channelError);
  console.log("dateError", dateError);
  console.log("mount success", date);
  buildXml(
    eventNVR,
    idError,
    csidError,
    partition,
    idEmp,
    eventError,
    channelError,
    dateError
  );
}
function buildXml(
  eventNVR,
  idError,
  csidError,
  partition,
  idEmp,
  eventError,
  channelError,
  dateError
) {
  let date = new Date();
  let localDate = date.toLocaleString();
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
  </SOAP-ENV:Envelope>`;
  const optionsToJson = {
    attributeNamePrefix: "@_",
    //attrNodeName: false,
    //textNodeName : "#text",
    ignoreAttributes: false,
    ignoreNameSpace: false,
  };
  const parser = new XMLParser(optionsToJson);
  const xmlJson = parser.parse(xmlDataBase);

  try {
    //console.log('antes', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])

    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].auxiliar = "000";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].codigo = "E602";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].data = "2022-11-29T09:30:47Z";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].descricaoReceptora = "PORTAL_SWS";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].empresa = "10017";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].idCentral = "0496";
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].identificadorCliente = ''
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].particao = "001";
    xmlJson["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["m:receberEvento"][
      "evento"
    ].protocolo = "2";
    //xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'].tipoIntegracao = '1'

    //console.log('depois', xmlJson['SOAP-ENV:Envelope']['SOAP-ENV:Body']['m:receberEvento']['evento'])
  } catch (e) {
    console.log("error build xmlEvent", e);
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
  const builder = new XMLBuilder(optionsToXML);
  let xmlDataStr = builder.build(xmlJson);
  //console.log(xmlDataStr)

  console.log("build xml", date);

  sendEvent(xmlDataStr, idError);
}
async function sendEvent(xmlDataStr, idError) {
  let date = new Date();
  let localDate = date.toLocaleString();
  let config = { headers: { "Content-Type": "text/xml" } };
  let url = process.env.URL_EVENT;
  let statusError = false;
  let returnDataXML;
  console.log("idError", idError);

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
  let date = new Date();
  let localDate = date.toLocaleString();

  try {
    await dbMysql.query(
      `UPDATE eventos_dvr.events SET STATUS_ = 'ENVIADO', DT_SEND = '${localDate}' WHERE (ID_EVENTO = '${idError}');`,
      { type: dbMysql.QueryTypes.UPDATE }
    );
  } catch (e) {
    console.log("error update status event", e);
    return;
  }
  console.log("updateStatusEvent", date);
}
function debug() {
  console.log("debug");
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
  let date = new Date();
  let localDate = date.toLocaleString();
  logger.info("sendEvent is running...", localDate);
  console.log("sendEvent is running...", localDate);
  selectEvent();
});
//---------------Status Server------------------//
app.get("/", function (req, res) {
  res.json("sendEvent is running 1.0");
});
app.listen(process.env.PORT, function () {
  console.log(`Server is listening on PORT:${process.env.PORT}`);
  logger.info(`Server is listening on PORT:${process.env.PORT}`);
});
