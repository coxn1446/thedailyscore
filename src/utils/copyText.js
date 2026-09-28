const copyWithCommand = (text) => {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.width = '1px';
  area.style.height = '1px';
  area.style.padding = '0';
  area.style.border = '0';
  area.style.fontSize = '16px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  area.focus({ preventScroll: true });
  area.select();
  try {
    area.setSelectionRange(0, area.value.length);
  } catch {
    /* readonly fields on some browsers reject a range */
  }
  let ok = false;
  try {
    ok = typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
};

export const copyText = async (text) => {
  if (copyWithCommand(text)) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Could not copy');
};
