import { scroll, keyboardTool } from "cornerstone-tools";

const keys = {
  LEFT: 37,
  RIGHT: 39,
  SPACE: 32
};

const stackScroller = keyboardTool(e => {
  const eventData = e.detail;
  const keyCode = eventData.keyCode;

  if (keyCode !== keys.LEFT && keyCode !== keys.RIGHT) return;

  const step = keyCode === keys.LEFT ? -1 : 1;
  scroll(eventData.element, step, true);

  e.stopImmediatePropagation();
  return false;
});

const stackToggler = callback => {
  const keyDownCallback = e => {
    const eventData = e.detail;
    const keyCode = eventData.keyCode;

    if (keyCode !== keys.SPACE) return;
    callback();
  };
  return keyboardTool(keyDownCallback);
};

export { stackScroller, stackToggler };
