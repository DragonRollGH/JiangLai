import "../../utils.js";
import { range } from "../../utils.js";
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast';
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';


var page;
const db = wx.cloud.database();
const CALENDAR = db.collection("CALENDAR");
const DETAIL = db.collection("DETAIL");

const TP_N = 0;
const TP_S = 1;
const TP_M = 2;
const TP_E = 3;
const MAX_LIMIT = 20
const NOW = new Date();
var YEAR = NOW.getFullYear();
const year_got = [];

var data_ary = [];

function onLoad() {
  page = this;

  get_data_ary();
}

function get_data_ary() {
  // for collection CALENDAR
  if (-1 != year_got.indexOf(YEAR)) {
    return;
  }

  Toast.loading({
    message: 'loading...',
    forbidClick: true,
  });
  CALENDAR.where({yy: YEAR}).count().then(async res => {
    // console.log(res);
    let total = res.total;
    const batchTimes = Math.ceil(total / MAX_LIMIT);
    for (let i = 0; i < batchTimes; i++) {
      await CALENDAR.where({yy: YEAR}).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get().then(async res => {
        data_ary = data_ary.concat(res.data);
      });
    }
    // got collection CALENDAR
    // update history data without tp
    data_ary.forEach(data => {
      if (undefined == data.tp) {
        data.tp = TP_N;
        CALENDAR.doc(data._id).update({
          data: {
            tp: TP_N
          }
        });
      }
    });
    // console.log(data_ary);
    year_got.push(YEAR);
    reload_day_formatter();
    Toast.clear();
  });

}

// data: {yy,mm,dd,tp,g_id,d_id}
function add_doc(data) {
  return new Promise((resolve, reject) => {
    CALENDAR.add({
      data: data
    })
    .then(res => {
      data_ary.push({
        _id: res._id,
        tp: data.tp,
        yy: data.yy,
        mm: data.mm,
        dd: data.dd,
        d_id: data.d_id,
      });
      reload_day_formatter();
      resolve(res);
    })
    .catch(res => {
      reject(res);
    });
  });
}

// data: {yy,mm,dd}
function remove_doc(data) {
  return new Promise((resolve, reject) => {
    CALENDAR.where({
      yy: data.yy,
      mm: data.mm,
      dd: data.dd,
    }).remove()
    .then(res => {
      data_ary = data_ary.filter(i => !(i.yy == data.yy 
        && i.mm == data.mm
        && i.dd == data.dd));
      reload_day_formatter();
      resolve(res);
    })
    .catch(res => {
      reject(res);
    });
  });
}

// data: {c_id}
function get_tp(data) {
  if (undefined == data_ary) {
    return undefined;
  }

  return data_ary.find(i => i._id == data.c_id).tp;
}

function dayFormatter(day) {
  let y = day.date.getFullYear();
  let m = day.date.getMonth();
  let d = day.date.getDate();

  // 屏蔽选中高亮
  if ("selected" == day.type) {
    day.type = "";
  }

  // 有数据日期高亮
  let data = data_ary.find(o => y == o.yy && m == o.mm && d == o.dd);
  if (data) {
    switch (data.tp) {
      case TP_N:
        day.type = "selected";
        break;
      case TP_S:
        day.type = "start";
        break;
      case TP_M:
        day.type = "middle";
        break;
      case TP_E:
        day.type = "end";
        break;
      default:
        day.type = "selected";
        break; 
    }
  }

  return day;
}

function reload_day_formatter() {
  page.setData({
    dayFormatter: null
  });
  page.setData({
    dayFormatter: dayFormatter
  });
}

function on_tap_single(e) {
  let y = e.detail.getFullYear();
  let m = e.detail.getMonth();
  let d = e.detail.getDate();

  let url = `../detail/index?yy=${y}&mm=${m}&dd=${d}`;

  let day_data = data_ary.find(o => y == o.yy && m == o.mm && d == o.dd);

  if (day_data) {
    url += `&c_id=${day_data._id}&d_id=${day_data.d_id}&tp=${day_data.tp}`;
  }
  wx.navigateTo({
    url: url,
  });
}

function on_tap_range(e) {
  let date_s = e.detail[0];
  let date_e = e.detail[1];
  let date_m_ary = [];
  let range_len = Math.round((date_e.getTime() - date_s.getTime()) / (24*60*60*1000) + 1);

  // get date_m_ary
  for (let i = date_s.getTime(); i <= date_e.getTime(); ) {
    let t = new Date(i);
    let y = t.getFullYear();
    let m = t.getMonth();
    let d = t.getDate();
    date_m_ary.push({
      yy: y,
      mm: m,
      dd: d,
    });
    let data;
    if (undefined != (data = data_ary.find(o => y == o.yy && m == o.mm && d == o.dd))) {
      if (TP_N != data.tp) {
        Toast.fail({
          message: '选择范围包含多日记录！',
          forbidClick: true,
        });
        return;
      }
    }
    i += (24*60*60*1000);
  }

  Dialog.confirm({
    title: '警告',
    message: `确认添加${date_m_ary.length}日记录？`,
  })
  .then(() => {
    // on confirm
    Toast.loading({
      message: '创建记录中...',
      forbidClick: true,
    });
    let g_id = new Date().getTime()
    for (let i in date_m_ary) {
      let d_id;
      let tp = TP_M;
      if (i == 0) {
        tp = TP_S;
      } else if (i == date_m_ary.length-1) {
        tp = TP_E;
      }
      // already exist
      let data;
      if (undefined != (data = data_ary.find(
        o => date_m_ary[i].yy == o.yy 
        && date_m_ary[i].mm == o.mm 
        && date_m_ary[i].dd == o.dd))) {
        CALENDAR.doc(data._id).update({
          data: {
            tp: tp,
            g_id: g_id,
          }
        });
        data.tp = tp;
        data.g_id = d_id;
        continue;
      }
      // new
      DETAIL.add({data: {}})
      .then(res => {
        d_id = res._id;
        page.add_doc({
          yy: date_m_ary[i].yy,
          mm: date_m_ary[i].mm,
          dd: date_m_ary[i].dd,
          tp: tp,
          g_id: g_id,
          d_id: d_id,
        });
      });
    }
    page.setData({
      calendar_type: "single",
      range_swt_checked: false,
    });
    Toast.clear();
  })
  .catch(() => {
    // on cancel
  });
}

function on_tap_day(e) {
  if (e.detail instanceof Date)
  {
    on_tap_single(e);
  } else if (e.detail instanceof Array) {
    if (e.detail.length == 2 && e.detail[1] != null) {
      on_tap_range(e);
    }
  }
}

function on_click_year_btn(e) {
  page.setData({
    year_picker_pop: true,
  });
}

function on_click_range_swt(e) {
  if (page.data.range_swt_checked) {
    page.setData({
      calendar_type: "single",
      range_swt_checked: false,
    });
  } else {
    page.setData({
      calendar_type: "range",
      range_swt_checked: true,
    })
  }

}

function on_cancel_year_picker(e) {
  page.setData({
    year_picker_pop: false,
  });
}

function on_confirm_year_picker(e) {
  YEAR = e.detail.value; 
  page.setData({
    mindate: new Date(YEAR, 0, 1).getTime(),
    maxdate: YEAR == NOW.getFullYear() ? NOW.getTime() : new Date(YEAR, 11, 31).getTime(),
    year_picker_pop: false,
  });
  get_data_ary();
}

Page({
  name: "calendar",
  data:{
    calendar_height: String(wx.getSystemInfoSync().windowHeight - 100) + "px",
    mindate: new Date(YEAR, 0, 1).getTime(),
    maxdate: NOW.getTime(),
    defaultdate: NOW.getTime(),
    year_picker_pop: false,
    year_picker_val: range(2017, YEAR + 1),
    year_picker_dft: YEAR - 2017,
    calendar_type: "single",
    range_swt_checked: false,
  },
  data_ary: [],
  onLoad: onLoad,
  add_doc: add_doc,
  remove_doc: remove_doc,
  get_tp: get_tp,
  on_tap_day: on_tap_day,
  on_click_year_btn: on_click_year_btn,
  on_click_range_swt: on_click_range_swt,
  on_cancel_year_picker: on_cancel_year_picker,
  on_confirm_year_picker: on_confirm_year_picker,
})