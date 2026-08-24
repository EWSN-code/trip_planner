const KEY="travel_planner_v2_state";export const Storage={async load(){const x=localStorage.getItem(KEY);return x?JSON.parse(x):null},async save(s){localStorage.setItem(KEY,JSON.stringify(s))}};
