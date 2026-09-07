import { reactive } from 'vue';

export const dialogState = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'ยืนยัน',
  cancelText: 'ยกเลิก',
  showCancel: true,
  variant: 'primary',
  input: null,
  inputValue: '',
  resolver: null,
});

function showDialog(options = {}) {
  if (dialogState.resolver) dialogState.resolver(null);
  Object.assign(dialogState, {
    open: true,
    title: options.title || 'ยืนยันการดำเนินการ',
    message: options.message || '',
    confirmText: options.confirmText || 'ยืนยัน',
    cancelText: options.cancelText || 'ยกเลิก',
    showCancel: options.showCancel !== false,
    variant: options.variant || 'primary',
    input: options.input || null,
    inputValue: options.input?.value || '',
  });
  return new Promise((resolve) => { dialogState.resolver = resolve; });
}

export function appConfirm(message, options = {}) {
  return showDialog({ ...options, message });
}

export function appAlert(message, options = {}) {
  return showDialog({
    ...options,
    message,
    confirmText: options.confirmText || 'รับทราบ',
    showCancel: false,
  });
}

export function appPrompt(message, options = {}) {
  return showDialog({
    ...options,
    message,
    input: {
      label: options.inputLabel || 'กรอกข้อมูลเพื่อยืนยัน',
      placeholder: options.placeholder || '',
      type: options.inputType || 'text',
      required: options.required !== false,
      value: options.value || '',
    },
  });
}

export function resolveDialog(confirmed) {
  const resolve = dialogState.resolver;
  const value = confirmed ? (dialogState.input ? dialogState.inputValue : true) : null;
  dialogState.open = false;
  dialogState.resolver = null;
  resolve?.(value);
}
