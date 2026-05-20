import {
  SELECTED_SHOP_ID_KEY,
  SELECTED_SHOP_NAME_KEY,
  SELECTED_SHOP_TYPE_KEY,
} from "./constants";

export function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  };
}