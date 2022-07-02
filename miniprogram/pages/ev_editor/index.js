import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog';
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast';

var idx;
var page;
var pages;
var detail_page;


function onLoad(option) {
  page = this;
  pages = getCurrentPages();
  detail_page = pages.find(i => i.name == "detail");
  idx = option.idx;

  let ev = detail_page.get_ev({idx: idx});
  if (undefined != ev) {
    page.setData({
      site_val: ev.site,
      type_val: ev.type,
      info_val: ev.info,
    });
  }
}

function on_submit(e) {
  if (undefined == idx) {
    return;
  }

  Toast.loading({
    message: '更新记录中...',
    forbidClick: true,
  });
  detail_page.update_ev({
    idx: idx,
    site: page.data.site_val,
    type: page.data.type_val,
    info: page.data.info_val,
  })
  .then(res => {
    Toast.clear();
    wx.navigateBack({
      delta: 0,
    });
  })
  .catch(res => {
    console.log(res);
    Toast.fail("更新失败！");
  });
} 

function on_delete(e) {
  Dialog.confirm({
    title: '警告',
    message: '是否确认删除本项条目？',
  })
  .then(() => {
    // on confirm
    Toast.loading({
      message: '删除记录中...',
      forbidClick: true,
    });
    detail_page.remove_ev({
      idx: idx
    })
    .then(res => {
      Toast.clear();
      wx.navigateBack({
        delta: 0,
      });
    })
    .catch(res => {
      console.log(res);
      Toast.fail("删除失败！");
    });
  })
  .catch(() => {
    // on cancel
  });
}

Page({
  name: "ev_editor",
  data: {
    autosize: {minHeight: 50},
    site_val: "",
    type_val: "",
    info_val: "",
    site_picker_pop: false,
    site_picker_ary: [
      "E2206",
      "东湖",
      "淘金山"
    ]
  },
  onLoad: onLoad,
  on_submit: on_submit,
  on_delete: on_delete,
})