export interface ApiHealth {
  status: "ok";
  service: "deutschtrainer-api";
}

export function getApiHealth(): ApiHealth {
  return {
    status: "ok",
    service: "deutschtrainer-api",
  };
}
