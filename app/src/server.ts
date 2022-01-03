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

const targetUrl = process.env.TARGET_URL
if (!targetUrl) throw Error('Needs target url')
console.log(`Proxy to ${targetUrl}`)

const app = express();

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  followRedirects: true
});

app.use(cookieParser())
app.use(async function (req, res) {
  const doProxy = () => proxy.web(req, res, { target: targetUrl })
  const conf: conf = JSON.parse(fs.readFileSync('./assets/conf.json').toString())

  if (conf.whiteListHost.includes(req.get('host') || '')) doProxy()
  else detectGBotHandler(req, res, conf, doProxy)
})

app.listen(3000)


async function detectGBotHandler(req: Request, res: Response, conf: conf, cbProxy: () => void) {
  const ip = req.get("HTTP_CF_CONNECTING_IP") || req.get("x-real-ip") || ''
  const loginCookies = Object.keys(req.cookies).map(k => k.includes("wordpress_logged_in"))

  const isWhiteIp = () => conf.whiteListIp.includes(ip);
  const hasLoginCookie = () => loginCookies.length > 0 ? loginCookies.reduce((a, b) => a || b) : false
  const isWhitePath = () => (conf.whiteListUrlPath[req.get('host') || ''] || conf.fallbackWhiteListPath).includes(req.path)
  const isGBot = () => isGoogleBot(req, res);

  if (isWhiteIp() || hasLoginCookie() || isWhitePath() || await isGBot()) {
    res.header("Cache-Control", "max-age=0");
    res.header("X-Frame-Options", "DENY");
    res.header("X-Robots-Tag", "noarchive");
    cbProxy()
  } else {
    res.header("Cache-Control", "max-age=0");
    res.header("X-Frame-Options", "DENY");
    res.header("Status", "503 Service Temporarily Unavailable");
    res.status(503)
    res.send(cloakHtml);
  }

}