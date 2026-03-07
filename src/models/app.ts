export const COOKIE_STORAGE_KEY = 'coupang_cookie' as const;

export interface CookieState {
  value: string | null;
  isSet: boolean;
  savedAt: string | null;
}

export const defaultCookieState: CookieState = {
  value: null,
  isSet: false,
  savedAt: null,
};

export interface SelectedMonth {
  year: number;
  month: number; // 1~12
}

export const defaultSelectedMonth: SelectedMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

