const DEVICE_KEY = "travel_planner_device_theme";
export const THEME_OPTIONS = [
  { value: "system", label: "端末設定に合わせる" },
  { value: "light", label: "Journey Light" },
  { value: "dark", label: "Night Travel" },
  { value: "paper", label: "Warm Paper" }
];
export function getDeviceTheme(){return localStorage.getItem(DEVICE_KEY)||""}
export function setDeviceTheme(value){value?localStorage.setItem(DEVICE_KEY,value):localStorage.removeItem(DEVICE_KEY)}
export function effectiveTheme(cloudTheme="system"){
  const selected=getDeviceTheme()||cloudTheme||"system";
  if(selected==="system")return matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  return selected;
}
export function applyTheme(cloudTheme="system"){
  const theme=effectiveTheme(cloudTheme);
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme==="dark"?"dark":"light";
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==="dark"?"#111816":theme==="paper"?"#f4ead8":"#f4f7f6";
  return theme;
}
export function watchSystemTheme(getCloudTheme){
  const media=matchMedia("(prefers-color-scheme: dark)");
  const listener=()=>{if((getDeviceTheme()||getCloudTheme()||"system")==="system")applyTheme(getCloudTheme())};
  media.addEventListener?.("change",listener);
}
