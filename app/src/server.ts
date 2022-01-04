import express from 'express';
import httpProxy from 'http-proxy';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { Request, Response } from 'express';
import { isGoogleBot } from './cloak';

type conf = {
  whiteListIp: string[]
  whiteListUrlPath: Record<string, string[]>
  fallbackWhiteListPath: string[]
  whiteListHost: string[]
}

let cloakHtml = fs.readFileSync('./assets/cloak.html').toString()
const targetUrl = process.env.TARGET_URL || "http://185.209.228.193"
if (!targetUrl) throw Error('Needs target url')
console.log(`Proxy to ${targetUrl}`)


const app = express();

const proxy = httpProxy.createProxyServer({
  followRedirects: true
});

app.use(cookieParser())
app.use(async function (req, res) {
  const doProxy = (req: Request, res: Response) => proxy.web(req, res, { target: targetUrl })
  const unavailable = (res: Response) => {
    res.header("Cache-Control", "max-age=0");
    res.header("X-Frame-Options", "DENY");
    res.header("Status", "503 Service Temporarily Unavailable");
    res.status(503)
    res.send(cloakHtml);
  }
  const conf: conf = JSON.parse(fs.readFileSync('./assets/conf.json').toString())

  if (conf.whiteListHost.includes(req.get('host') || '')) doProxy(req, res)
  else detectGBotHandler(req, res, conf, doProxy, unavailable)
})

app.listen(3000)


type detectGBotHandlerArgs = [
  req: Request,
  res: Response,
  conf: conf,
  cbProxy: (req: Request, res: Response) => void,
  unavailable: (res: Response) => void
]
async function detectGBotHandler(...[req, res, conf, cbProxy, cbUnavailable]: detectGBotHandlerArgs) {
  const ip = req.get("cf-connecting-ip") || req.get("x-real-ip") || ''
  const loginCookies = Object.keys(req.cookies).map(k => k.includes("wordpress_logged_in"))
  res.send([ip, req.headers])
  return;
  const isWhiteIp = () => conf.whiteListIp.includes(ip);
  const hasLoginCookie = () => loginCookies.length > 0 ? loginCookies.reduce((a, b) => a || b) : false
  const isWhitePath = () => {
    const local = (conf.whiteListUrlPath[req.get('host') || ''] || conf.fallbackWhiteListPath).includes(req.path)
    console.log(req.path)
    const isStaticfile = /\d/.test(req.path)
    return local || isStaticfile
  }
  const isGBot = () => isGoogleBot(req, res);
  console.log(isWhiteIp(), hasLoginCookie(), isWhitePath(), await isGBot())
  if (isWhiteIp() || hasLoginCookie() || isWhitePath() || await isGBot()) {
    res.header("Cache-Control", "max-age=0");
    res.header("X-Frame-Options", "DENY");
    res.header("X-Robots-Tag", "noarchive");
    cbProxy(req, res)
  } else {
    cbUnavailable(res)
  }

}