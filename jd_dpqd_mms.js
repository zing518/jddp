/**
 * cron: 20 0 0 * * *
*/
console.log('当前版本号', '20221105-v1.0，你自己玩fa财da赢jia的话就把这个脚本禁用！')
console.log('若脚本报错则增加变量TK_SIGN_method为planb再试一次，还不行就用旧脚本！')
const yxl = require('./depend/yxl')
const $ = new yxl.Env('fa财da赢jia助力（店铺签到专用）');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
if (process.env.TK_SIGN_method && process.env.TK_SIGN_method == 'planb') {
    $.changeplan = true
} else {
    $.changeplan = false
}
if (process.env.TK_SIGN_ID) {
    $.TK_SIGN_ID = process.env.TK_SIGN_ID || ''
    $.TK_SIGN_SIGN = process.env.TK_SIGN_SIGN || ''
    $.TK_SIGN = { id: $.TK_SIGN_ID, sign: $.TK_SIGN_SIGN }
} else if (process.env.TK_SIGN) {
    $.TK_SIGN = process.env.TK_SIGN
    $.TK_SIGN = $.toObj($.TK_SIGN, $.TK_SIGN)
} else {
    console.log('联系@dpqd_boss获取TK_SIGN.')
}
let helpinfo = {};

!(async () => {

    console.log(typeof $.TK_SIGN.id, `TK_SIGN.id:${$.toStr($.TK_SIGN.id)}`);
    await $.wait(yxl.randomNumber(1000, 5000))
    $.apidata = await yxl[$.changeplan ? 'readapi1' : 'readapi']('TOKEN', $.TK_SIGN.id, $.TK_SIGN.sign)
    $.apidata = $.toObj($.apidata, $.apidata)
    if (typeof $.apidata != "object") {
        $.apidata = []
        return
    }
    //等到0点0分20秒$.apidata.begain值为开始秒数
    if (new Date().getHours() == 0) {
        $.zerotime = await yxl.zerotime($.apidata.begain * 1000) //单位毫秒
        if ($.zerotime < 120000) {
            console.log(`还未获取到助力码，等待${$.zerotime / 1000}秒......`);
            await $.wait($.zerotime)
        }
    }
    // 验证是否获取到助力码 
    for (let i = 1; i < 7; i++) {
        new Date().getHours() == 0 || i > 1 ? $.apidata = await yxl[$.changeplan ? 'readapi1' : 'readapi']('TOKEN', $.TK_SIGN.id, $.TK_SIGN.sign) : ''
        $.apidata = $.toObj($.apidata, $.apidata)
        if (typeof $.apidata != "object") {
            continue
        }
        $.mms = $.apidata.mms
        $.mms = $.toObj($.mms, $.mms)
        console.info(`获取到mms:\n${$.toStr($.mms)}`);
        $.PROXY_LIST = $.apidata.plist
        $.PROXY_LIST = $.toObj($.PROXY_LIST, $.PROXY_LIST)
        console.info(`获取到PROXY_LIST:\n${$.toStr($.PROXY_LIST)}`);
        if ($.mms.length === 0) {
            console.log(`还未获取到助力码，${i === 6 ? 600 : i * 5}s后继续`);
            await $.wait(i === 6 ? 600000 : i * 5000)
        } else {
            console.log('获取到助力码，可以继续下一步！')
            break
        }
        i == 6 ? console.log('最终无法获取到助力码，退出！') : ''
    }
    if ($.mms.length === 0) {
        ;
        return
    }

    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.canUseCoinAmount = 0;
            helpinfo[$.UserName] = {};
            UA = yxl.USER_AGENT;
            helpinfo[$.UserName].ua = UA;

            await TotalBean();
            console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }

            await getinfo(1);
            await $.wait(1000);
        }
    }
    if ($.mms.length > 0) {
        console.log('\n\n开始助力...')
        for (let j = 0; j < $.mms.length; j++) {
            console.log('\n去助力--> ' + $.mms[j]);
            for (let i = 0; i < cookiesArr.length; i++) {
                if (cookiesArr[i]) {
                    cookie = cookiesArr[i];
                    $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
                    $.index = i + 1;
                    UA = helpinfo[$.UserName].ua;
                    console.log(`\n开始【账号${$.index}】${$.nickName || $.UserName}`);
                    if (helpinfo[$.UserName].nohelp) { console.log('已无助力次数了'); continue };
                    if (helpinfo[$.UserName].hot) { console.log('可能黑了，跳过！'); continue };
                    await help($.mms[j]);
                    console.log('随机等待2-5秒');
                    await $.wait(parseInt(Math.random() * 3000 + 2000, 10))
                }
            }
        }
    } else {
        console.log('无助力码！！\n')
    }

})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

function getinfo(xc) {
    return new Promise(async (resolve) => {
        $.get(taskUrl('makemoneyshop/home', 'activeId=63526d8f5fe613a6adb48f03&_stk=activeId&_ste=1'), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    let tostr = data.match(/\((\{.*?\})\)/)[1];
                    data = eval('(' + tostr + ')');
                    if (data.code == 0) {
                        if (xc) {
                            console.log('账号正常去助力！');
                        }
                    } else {
                        console.log(data.msg);
                        $.hotflag = true;
                        helpinfo[$.UserName].hot = 1;
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function help(shareid) {
    return new Promise(async (resolve) => {
        $.get(taskUrl('makemoneyshop/guesthelp', `activeId=63526d8f5fe613a6adb48f03&shareId=${shareid}&_stk=activeId,shareId&_ste=1`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(` API请求失败，请检查网路重试`)
                } else {
                    let tostr = data.match(/\((\{.*?\})\)/)[1];
                    data = eval('(' + tostr + ')');
                    if (data.code == 0) {
                        console.log('助力成功！');
                        helpinfo[$.UserName].nohelp = 1;
                    } else if (data.msg === '已助力') {
                        console.log('你已助力过TA！')
                        helpinfo[$.UserName].nohelp = 1;
                    } else if (data.code === 1006) {
                        console.log('不能助力自己！');
                    } else if (data.code === 1008) {
                        console.log('今日无助力次数了！');
                    } else {
                        console.log(data.msg);
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
}

function taskUrl(fn, body) {
    return {
        url: `https://wq.jd.com/${fn}?g_ty=h5&g_tk=&appCode=msc588d6d5&${body}&h5st=&sceneval=2&callback=__jsonp1667344808184`,
        headers: {
            'Origin': 'https://wq.jd.com',
            'Referer': 'https://wqs.jd.com/sns/202210/20/make-money-shop/index.html?activeId=63526d8f5fe613a6adb48f03',
            'User-Agent': UA,
            'Cookie': cookie
        }
    }
}

function TotalBean() {
    return new Promise((resolve) => {
        const options = {
            url: 'https://plogin.m.jd.com/cgi-bin/ml/islogin',
            headers: {
                "Cookie": cookie,
                "referer": "https://h5.m.jd.com/",
                "User-Agent": UA,
            },
            timeout: 10000
        }
        $.get(options, (err, resp, data) => {
            try {
                if (data) {
                    data = JSON.parse(data);
                    if (data.islogin === "1") {
                    } else if (data.islogin === "0") {
                        $.isLogin = false;
                    }
                }
            } catch (e) {
                console.log(e);
            }
            finally {
                resolve();
            }
        });
    });
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}
