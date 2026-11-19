import { back, push, replace } from "@zos/router";

function getNavigation() {
  const globalData = getApp().globalData;
  if (!globalData.navigation) {
    globalData.navigation = { stack: [], returnTarget: null };
  }
  return globalData.navigation;
}

export function enterWatchPage(url) {
  const navigation = getNavigation();
  const index = navigation.stack.lastIndexOf(url);
  if (index < 0) {
    navigation.stack = [url];
  } else {
    navigation.stack.length = index + 1;
  }

  if (navigation.returnTarget && url !== navigation.returnTarget) {
    if (navigation.stack.slice(0, -1).includes(navigation.returnTarget)) {
      back();
      return false;
    }
    const target = navigation.returnTarget;
    navigation.returnTarget = null;
    replaceWatchPage({ url: target });
    return false;
  }

  navigation.returnTarget = null;
  return true;
}

export function pushWatchPage(options) {
  const { stack } = getNavigation();
  if (stack[stack.length - 1] !== options.url) {
    stack.push(options.url);
    push(options);
  }
}

export function replaceWatchPage(options) {
  const { stack } = getNavigation();
  stack.splice(Math.max(0, stack.length - 1), 1, options.url);
  replace(options);
}

export function returnToWatchPage(url) {
  const navigation = getNavigation();
  if (navigation.stack.slice(0, -1).includes(url)) {
    navigation.returnTarget = url;
    back();
    return;
  }
  navigation.returnTarget = null;
  replaceWatchPage({ url });
}
