// Small vanilla helpers for pill2 markup.
// CSS owns the visual component; these only normalize source metadata and emit
// compact caption/source pills. Not a general pill factory for every pill2 layout.

const PILL2_SOURCE_META = Object.freeze({
  manualRandom: Object.freeze({
    key: "manualRandom",
    toneClass: "pill2--tone-randomM",
    caption: "Random"
  }),
  manualChoice: Object.freeze({
    key: "manualChoice",
    toneClass: "pill2--tone-choiceM",
    caption: "Choice"
  }),
  topUpRandom: Object.freeze({
    key: "topUpRandom",
    toneClass: "pill2--tone-randomTU",
    caption: "Random"
  }),
  topUpChoice: Object.freeze({
    key: "topUpChoice",
    toneClass: "pill2--tone-choiceTU",
    caption: "Choice"
  })
});

const SOURCE_ALIASES = Object.freeze({
  manualrandom: "manualRandom",
  manual_random: "manualRandom",
  manual_random_chest: "manualRandom",
  manual_random_item: "manualRandom",
  manual_random_items: "manualRandom",
  manual_randoms: "manualRandom",
  manualrandoms: "manualRandom",
  randomm: "manualRandom",
  mrandom: "manualRandom",
  manualchoice: "manualChoice",
  manual_choice: "manualChoice",
  manual_choice_chest: "manualChoice",
  manual_choice_item: "manualChoice",
  manual_choice_items: "manualChoice",
  manual_choices: "manualChoice",
  manualchoices: "manualChoice",
  choicem: "manualChoice",
  mchoice: "manualChoice",
  topuprandom: "topUpRandom",
  top_up_random: "topUpRandom",
  topup_random: "topUpRandom",
  top_up_random_chest: "topUpRandom",
  top_up_random_item: "topUpRandom",
  top_up_random_items: "topUpRandom",
  top_up_randoms: "topUpRandom",
  topuprandoms: "topUpRandom",
  randomtu: "topUpRandom",
  turandom: "topUpRandom",
  topupchoice: "topUpChoice",
  top_up_choice: "topUpChoice",
  topup_choice: "topUpChoice",
  top_up_choice_chest: "topUpChoice",
  top_up_choice_item: "topUpChoice",
  top_up_choice_items: "topUpChoice",
  top_up_choices: "topUpChoice",
  topupchoices: "topUpChoice",
  choicetu: "topUpChoice",
  tuchoice: "topUpChoice"
});

function pill2Escape(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function pill2ClassName(...values){
  const seen=new Set();
  const tokens=[];
  values.forEach(value=>{
    String(value || "").split(/\s+/).forEach(token=>{
      if(!token || seen.has(token)) return;
      seen.add(token);
      tokens.push(token);
    });
  });
  return tokens.join(" ");
}

function normalizeSourceToken(value){
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g,"$1_$2")
    .replace(/[\s-]+/g,"_")
    .replace(/[^A-Za-z0-9_]/g,"")
    .toLowerCase();
}

function normalizeOrigin(value){
  const token=normalizeSourceToken(value).replace(/_/g,"");
  if(token==="manual" || token==="m") return "manual";
  if(token==="topup" || token==="topupbundle" || token==="tu") return "topUp";
  return "";
}

function normalizeKind(value){
  const token=normalizeSourceToken(value).replace(/_/g,"");
  if(token==="random" || token==="randomchest") return "Random";
  if(token==="choice" || token==="choicechest") return "Choice";
  return "";
}

export function getPill2SourceMeta(source){
  if(source && typeof source==="object"){
    const key=source.key || source.pillSource || source.sourceKey;
    if(key){
      const fromKey=getPill2SourceMeta(key);
      if(fromKey) return fromKey;
    }

    const origin=normalizeOrigin(source.origin || source.source || source.sourceType || source.group || source.from);
    const kind=normalizeKind(source.kind || source.type || source.choiceType || source.chestType || source.interaction);
    if(origin && kind){
      return PILL2_SOURCE_META[`${origin}${kind}`] || null;
    }
  }

  const token=normalizeSourceToken(source);
  const key=SOURCE_ALIASES[token] || SOURCE_ALIASES[token.replace(/_/g,"")];
  return key ? PILL2_SOURCE_META[key] : null;
}

export function pill2SourceClassName(source){
  return getPill2SourceMeta(source)?.toneClass || "";
}

export function pill2SourceCaption(source){
  return getPill2SourceMeta(source)?.caption || "";
}

export function renderPill2(config={}){
  const meta=getPill2SourceMeta(config.source);
  const size=config.size || "md";
  const level=config.level ?? "";
  const levelText=level !== "" && /^L/i.test(String(level)) ? String(level) : `L${level}`;
  const qty=config.qty ?? config.value ?? "";
  const caption=config.caption ?? meta?.caption ?? "";
  const toneClass=config.toneClass || meta?.toneClass || "pill2--tone-neutral";
  const pillClass=pill2ClassName(
    "pill2",
    `pill2--${size}`,
    "pill2--compact",
    toneClass,
    config.className
  );
  const unitClass=pill2ClassName(
    "pill2-unit",
    "pill2-unit--inside",
    toneClass,
    config.unitClassName
  );
  // attrs is a pre-built, trusted attribute string for internal hooks only.
  const attrs=config.attrs ? ` ${config.attrs}` : "";
  return `<span class="${unitClass}"${attrs}><span class="${pillClass}">`+
    `${level !== "" ? `<span class="pill2__level">${pill2Escape(levelText)}</span>` : ""}`+
    `${qty !== "" ? `<span class="pill2__qty">${pill2Escape(qty)}</span>` : ""}`+
    `${caption ? `<span class="pill2__caption">${pill2Escape(caption)}</span>` : ""}`+
    `</span></span>`;
}

export { PILL2_SOURCE_META };
