// Accent-insensitive text for search: "Viết bài" and "viet bai" match each other.
export const fold = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
