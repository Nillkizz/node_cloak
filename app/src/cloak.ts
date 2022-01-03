import dns from 'dns';
import { Request, Response } from 'express';

export async function isGoogleBot(req: Request, res: Response) {
  let isGbot = false;

  const ip = req.get("HTTP_CF_CONNECTING_IP") || req.get("x-real-ip") || ''
  // const ip = '66.249.66.1' // real google bot ip for testing

  const hostnames = (await getHostByAddr(ip)).filter(isGbotHost)
  if (hostnames.length > 0) {
    if (await getHostByName(hostnames[0]) == ip) {
      if (req.get('USER-AGENT')?.toLowerCase() == "googlebot") {
        const accept = req.get('ACCEPT');
        if (accept && accept.length >= 36) {
          isGbot = true
        }
      }
    }
  }


  // res.send(req.headers)
  return isGbot
}

async function getHostByAddr(ip: string) {
  try {
    return await dns.promises.reverse(ip);
  } catch (e) {
    return [ip];
  }
}

async function getHostByName(hn: string) {
  try {
    return (await dns.promises.resolve(hn))[0];
  } catch (e) {
    return hn;
  }
}


function isGbotHost(hn: string) {
  return hn.slice(-14) == ".googlebot.com"
}