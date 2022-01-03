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
exports.isGoogleBot = void 0;
const dns_1 = __importDefault(require("dns"));
function isGoogleBot(req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let isGbot = false;
        const ip = req.get("HTTP_CF_CONNECTING_IP") || req.get("x-real-ip") || '';
        // const ip = '66.249.66.1' // real google bot ip for testing
        const hostnames = (yield getHostByAddr(ip)).filter(isGbotHost);
        if (hostnames.length > 0) {
            if ((yield getHostByName(hostnames[0])) == ip) {
                if (((_a = req.get('USER-AGENT')) === null || _a === void 0 ? void 0 : _a.toLowerCase()) == "googlebot") {
                    const accept = req.get('ACCEPT');
                    if (accept && accept.length >= 36) {
                        isGbot = true;
                    }
                }
            }
        }
        // res.send(req.headers)
        return isGbot;
    });
}
exports.isGoogleBot = isGoogleBot;
function getHostByAddr(ip) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield dns_1.default.promises.reverse(ip);
        }
        catch (e) {
            return [ip];
        }
    });
}
function getHostByName(hn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return (yield dns_1.default.promises.resolve(hn))[0];
        }
        catch (e) {
            return hn;
        }
    });
}
function isGbotHost(hn) {
    return hn.slice(-14) == ".googlebot.com";
}
