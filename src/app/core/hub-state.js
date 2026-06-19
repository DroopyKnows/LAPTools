// Hub navigation + per-tool state (in-memory, schema-versioned).

const HUB_STATE_SCHEMA_VERSION=1;
const HUB_HOME_CATEGORY_DEFAULT="tools";
const HUB_HOME_CATEGORIES=["tools","guides","other"];
const HUB_HOME_PAGE_ID="homePage";

const DEFAULT_HUB_STATE={
  schemaVersion:HUB_STATE_SCHEMA_VERSION,
  navigation:{
    activePageId:HUB_HOME_PAGE_ID,
    homeCategory:HUB_HOME_CATEGORY_DEFAULT
  },
  tools:{}
};

function isPlainObject(value){
  return !!value && typeof value==="object" && !Array.isArray(value);
}

function cloneHubDefaultState(){ return JSON.parse(JSON.stringify(DEFAULT_HUB_STATE)); }

function normalizeHomeCategory(value){
  return HUB_HOME_CATEGORIES.includes(value) ? value : HUB_HOME_CATEGORY_DEFAULT;
}

function normalizeHubState(source){
  const src=isPlainObject(source) ? source : {};
  const navigation=isPlainObject(src.navigation) ? src.navigation : {};
  return {
    schemaVersion:HUB_STATE_SCHEMA_VERSION,
    navigation:{
      activePageId:typeof navigation.activePageId==="string" && navigation.activePageId ? navigation.activePageId : HUB_HOME_PAGE_ID,
      homeCategory:normalizeHomeCategory(navigation.homeCategory)
    },
    tools:isPlainObject(src.tools) ? JSON.parse(JSON.stringify(src.tools)) : {}
  };
}

const hubState=normalizeHubState(DEFAULT_HUB_STATE);

function getHubState(){ return hubState; }

function replaceHubState(source){
  const normalized=normalizeHubState(source);
  Object.keys(hubState).forEach(key=>delete hubState[key]);
  Object.assign(hubState,normalized);
  return hubState;
}

function getHubActivePageId(){ return hubState.navigation.activePageId; }

function setHubActivePageId(pageId){
  if(typeof pageId==="string" && pageId) hubState.navigation.activePageId=pageId;
  return hubState.navigation.activePageId;
}

function getHubHomeCategoryValue(){ return hubState.navigation.homeCategory; }

function setHubHomeCategoryValue(category){
  hubState.navigation.homeCategory=normalizeHomeCategory(category);
  return hubState.navigation.homeCategory;
}

function getHubToolState(toolId){
  if(!toolId) return {};
  if(!isPlainObject(hubState.tools[toolId])) hubState.tools[toolId]={};
  return hubState.tools[toolId];
}

function setHubToolState(toolId,value){
  if(!toolId) return {};
  hubState.tools[toolId]=isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
  return hubState.tools[toolId];
}

export {
  HUB_STATE_SCHEMA_VERSION,
  DEFAULT_HUB_STATE,
  cloneHubDefaultState,
  normalizeHubState,
  getHubState,
  replaceHubState,
  getHubActivePageId,
  setHubActivePageId,
  getHubHomeCategoryValue,
  setHubHomeCategoryValue,
  getHubToolState,
  setHubToolState
};
