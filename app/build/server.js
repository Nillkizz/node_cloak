"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const fs_1 = __importDefault(require("fs"));
const cloak_1 = require("./cloak");
let cloakHtml = fs_1.default.readFileSync('./assets/cloak.html').toString();
const targetUrl = process.env.TARGET_URL || "http://185.209.228.193";
if (!targetUrl)
    throw Error('Needs target url');
console.log(`Proxy to ${targetUrl}`);
const app = (0, express_1.default)();
const proxy = http_proxy_1.default.createProxyServer({
    followRedirects: true
});
app.use((0, cookie_parser_1.default)());
app.use(function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const doProxy = (req, res) => proxy.web(req, res, { target: targetUrl });
        const unavailable = (res) => {
            res.header("Cache-Control", "max-age=0");
            res.header("X-Frame-Options", "DENY");
            res.header("Status", "503 Service Temporarily Unavailable");
            res.status(503);
            res.send(cloakHtml);
        };
        const conf = JSON.parse(fs_1.default.readFileSync('./assets/conf.json').toString());
        if (conf.whiteListHost.includes(req.get('host') || ''))
            doProxy(req, res);
        else
            detectGBotHandler(req, res, conf, doProxy, unavailable);
    });
});
app.listen(3000);
function detectGBotHandler(...[req, res, conf, cbProxy, cbUnavailable]) {
    return __awaiter(this, void 0, void 0, function* () {
        const ip = req.get("cf-connecting-ip") || req.get("x-real-ip") || '';
        const loginCookies = Object.keys(req.cookies).map(k => k.includes("wordpress_logged_in"));
        res.send([ip, req.headers]);
        return;
        const isWhiteIp = () => conf.whiteListIp.includes(ip);
        const hasLoginCookie = () => loginCookies.length > 0 ? loginCookies.reduce((a, b) => a || b) : false;
        const isWhitePath = () => {
            const local = (conf.whiteListUrlPath[req.get('host') || ''] || conf.fallbackWhiteListPath).includes(req.path);
            console.log(req.path);
            const isStaticfile = /\d/.test(req.path);
            return local || isStaticfile;
        };
        const isGBot = () => (0, cloak_1.isGoogleBot)(req, res);
        console.log(isWhiteIp(), hasLoginCookie(), isWhitePath(), yield isGBot());
        if (isWhiteIp() || hasLoginCookie() || isWhitePath() || (yield isGBot())) {
            res.header("Cache-Control", "max-age=0");
            res.header("X-Frame-Options", "DENY");
            res.header("X-Robots-Tag", "noarchive");
            cbProxy(req, res);
        }
        else {
            cbUnavailable(res);
        }
    });
}
