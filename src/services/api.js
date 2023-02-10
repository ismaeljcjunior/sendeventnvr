import axios from "axios";

const api = axios.create({
  baseURL: "http://200.178.98.150:8090/SigmaWebServices/ReceptorEventosWebService",
});

export default api;