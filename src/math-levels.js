// Level-object helpers: rounding, merging, simplifying, and display conversion.

    function equivalentAtLevel(obj,level){
      let total=0;
      Object.keys(obj||{}).forEach(k=>{
        const sourceLevel=Number(k);
        const qty=Number(obj[k]||0);
        if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
      });
      return total;
    }

    function equivalentFromHigherAndLower(obj,level){
      let fromHigher=0;
      let lowerRaw=0;

      allItemLevels.forEach(sourceLevel=>{
        const qty=getQty(obj,sourceLevel);
        if(!qty) return;

        if(sourceLevel>=level){
          fromHigher += qty*Math.pow(3,sourceLevel-level);
        }else{
          lowerRaw += qty/Math.pow(3,level-sourceLevel);
        }
      });

      return fromHigher + Math.floor(lowerRaw);
    }

    function excelWholeCount(value){
      const n=Number(value || 0);
      if(!isFinite(n) || n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function excelDisplayWhole(value){
      const rounded=excelWholeCount(value);
      return rounded>0 ? String(rounded) : "-";
    }

    function addToLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*1000000)/1000000;
    }

    function addWholeToLevelObject(target,level,value){
      const n=Number(value||0);
      if(n>0) target[level]=Number(target[level]||0)+n;
    }

    function simplifyUpByLevel(source){
      const result={};
      let carry=0;

      for(let level=1;level<=MAX_ITEM_LEVEL;level++){
        const total=Number(source[level]||0)+carry;

        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=Math.round(total*1000000)/1000000;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-upgrades*3;
          if(remainder>0) result[level]=Math.round(remainder*1000000)/1000000;
          carry=upgrades;
        }
      }

      return result;
    }

    function simplifyExcelHelper(source,maxLevel=7){
      const result={};
      let carry=0;

      for(let level=1;level<=maxLevel;level++){
        const total=Number(source[level]||0)+carry;

        if(level===maxLevel){
          result[level]=Math.round(total*1000000)/1000000;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-upgrades*3;
          result[level]=Math.round(remainder*1000000)/1000000;
          carry=upgrades;
        }
      }

      return result;
    }

    function displayWholeByLevels(source,levels){
      return levels.map(level=>excelDisplayWhole(source[level]));
    }

    function mergedOwnedWithAddtl(owned,addtl){
      const merged={};
      allItemLevels.forEach(level=>{
        const total=getQty(owned,level)+getQty(addtl,level);
        if(total>0) merged[level]=total;
      });
      return merged;
    }

    function addLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*100)/100;
    }

    function makeSideSummaryText(leftObj,rightObj){
      const leftTotal=Object.values(leftObj||{}).reduce((a,b)=>a+Number(b||0),0);
      const rightTotal=Object.values(rightObj||{}).reduce((a,b)=>a+Number(b||0),0);
      if(leftTotal<=0 && rightTotal<=0) return "-";
      if(leftTotal>0 && rightTotal>0) return "Both";
      return leftTotal>0 ? "Left" : "Right";
    }

    function wholeExpectedFromRandom(qty, p){
      return Math.floor(Number(qty || 0) * p);
    }

    function simplifyWholeByLevel(source){
      const result={};
      let carry=0;
      for(let level=1; level<=MAX_ITEM_LEVEL; level++){
        const total=Math.floor(Number(source[level] || 0) + carry);
        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=(result[level]||0)+total;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-(upgrades*3);
          if(remainder>0) result[level]=(result[level]||0)+remainder;
          carry=upgrades;
        }
      }
      return result;
    }

    function mergeLevelObjects(){
      const merged={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj || {}).forEach(k=>{
          merged[k]=(merged[k] || 0) + Number(obj[k] || 0);
        });
      });
      return merged;
    }

    function calculateOwnedPlusPlanPlusChoice(owned, additionalOwned, guaranteed){
      return mergeLevelObjects(owned || {}, additionalOwned || {}, guaranteed || {});
    }

    function levelObjectEquivalentAtLevel(obj, level){
      let total=0;
      Object.keys(obj || {}).forEach(k=>{
        const sourceLevel=Number(k);
        const qty=Math.floor(Number(obj[k] || 0));
        if(sourceLevel>=level && qty>0){
          total += qty*Math.pow(3, sourceLevel-level);
        }
      });
      return total;
    }

    function excelRoundWhole(value){
      const n=safeNum(value);
      if(n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function simplifyBucketDecimal(rawByLevel){
      const result={};
      let carry=0;
      for(let level=1; level<=MAX_ITEM_LEVEL; level++){
        const total=safeNum(rawByLevel[level]) + carry;
        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=(result[level]||0)+total;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-(upgrades*3);
          if(remainder>0) result[level]=(result[level]||0)+remainder;
          carry=upgrades;
        }
      }
      return result;
    }

    function displayRowFromSimplified(simplified){
      const display={};
      Object.keys(simplified || {}).forEach(level=>{
        const whole=excelRoundWhole(simplified[level]);
        if(whole>0) display[level]=(display[level]||0)+whole;
      });
      return display;
    }

    function fractionalRemainderFromSimplified(simplified){
      const remainder={};
      Object.keys(simplified || {}).forEach(level=>{
        const value=safeNum(simplified[level]);
        const whole=excelRoundWhole(value);
        const leftover=value-whole;
        if(leftover>0) remainder[level]=(remainder[level]||0)+leftover;
      });
      return remainder;
    }

    function addObjects(target, source){
      Object.keys(source || {}).forEach(level=>{
        target[level]=(target[level]||0)+safeNum(source[level]);
      });
      return target;
    }

    function addDisplayRows(rows){
      const total={};
      rows.forEach(row=>addObjects(total,row));
      return total;
    }

    function valuesFromLevelObject(obj, levels){
      return levels.map(level=>{
        const value=safeNum(obj[level]);
        return value>0 ? String(Math.floor(value)) : "-";
      });
    }

    function levelObjectPlus(a,b){
      const result={};
      Object.keys(a||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(a[levelKey]||0));
        if(value>0) result[level]=(result[level]||0)+value;
      });
      Object.keys(b||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(b[levelKey]||0));
        if(value>0) result[level]=(result[level]||0)+value;
      });
      return result;
    }

    function cloneLevelObject(obj){
      const out={};
      Object.keys(obj||{}).forEach(k=>{
        const value=Number(obj[k]||0);
        if(value>0) out[k]=value;
      });
      return out;
    }

    function addLevelObjects(){
      const result={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj||{}).forEach(k=>{
          const value=Number(obj[k]||0);
          if(value>0) result[k]=(result[k]||0)+value;
        });
      });
      return result;
    }

    function convertValuesArrayToLevelObject(levels, values){
      const obj={};
      levels.forEach((level,index)=>{
        const raw=values[index];
        if(raw && raw !== "-"){
          const parsed=Number(String(raw).replace(/[^0-9.-]/g,""));
          if(parsed>0) obj[level]=parsed;
        }
      });
      return obj;
    }

    function levelObjectTotalCount(obj){
      return Object.values(obj||{}).reduce((sum,value)=>sum+Math.floor(Number(value||0)),0);
    }

    function subtractLevelObjects(source, subtractor){
      const result={};

      Object.keys(source||{}).forEach(level=>{
        const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
        if(value>0) result[level]=value;
      });

      return result;
    }

    function addObjectsRaw(target,source){
      Object.keys(source||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(source[levelKey]||0));
        if(value>0) target[level]=(target[level]||0)+value;
      });
      return target;
    }

