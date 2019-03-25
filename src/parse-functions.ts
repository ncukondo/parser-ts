import { Source } from './source';
import { Parser, Child } from './parser';
import { ParseSuccess, ParseFailure, ParseSkip, ParseResult } from "./parse-result";
import { ParserHunter } from './parser';
export {text, seq, regexp, select,skip,many,option,ParserHunter,flat,lazy,dummy,map,children,child, capture, childFunc,seqArray,manyArray,skipRight,skipLeft,combine };

type childFunc<P> = (parentValue:P,s:Source) => ParseResult<P>;

const text = (target: string): Parser<string> => {
  const func = (s: Source) => {
    const len = target.length;
    if (s.text(len) === target) {
      return new ParseSuccess<string>(s.move(len), target);
    }else {
      return new ParseFailure<string>(s);
    }
  };
  return new Parser<string>(func);
};

const regexp = (reg: RegExp): Parser<string> => {
  const func = (s: Source) => {
    if(!reg.sticky) reg = new RegExp(reg.source,reg.flags+"y");
    reg.lastIndex = 0;
    const res =  reg.exec(s.text());
    if (res && res[0]) {
      return new ParseSuccess<string>(s.move(res[0].length), res[0]);
    }else {
      return new ParseFailure<string>(s);
    }
  };
  return new Parser(func);
};

const seq = <T>(...parsers: Parser<T>[]): Parser<T[]> => {
  const func = (s: Source) => {
    const originalSource = s;
    let result = <T[]>[];
    for(const parser of parsers){
      const res = parser.parse(s);
      s = res.source;
      if(res.isFailure()) return new ParseFailure<T[]>(originalSource);
      if(res.isSuccess()) result = [...result,res.value];
    }
    return new ParseSuccess<T[]>(s,result);
};
  return new Parser(func);
};

const seqArray = <T>(...parsers: Parser<T[]>[]): Parser<T[]> => {
  const func = (s: Source) => {
    const originalSource = s;
    let result = <T[]>[];
    for(const parser of parsers){
      const res = parser.parse(s);
      s = res.source;
      if (res.isSuccess()) {
        result = [...result,...res.value];
      }else if (res.isFailure()) {
        return new ParseFailure<T[]>(originalSource)
      }
    }
    return new ParseSuccess<T[]>(s,result);
};
  return new Parser(func);
};


const many = <T>(parser: Parser<T>): Parser<T[]> => {
  const func = (s: Source) => {
    let values =<T[]>[]; 
    while(true){
      const res = parser.parse(s);
      s = res.source;
      if (res.isSuccess()) {
        values = [...values,res.value];
      }else if (res instanceof ParseFailure) {
        break;
      }
    }
    return new ParseSuccess<T[]>(s,values);
  };
  return new Parser(func);
};

const manyArray = <T>(parser: Parser<T[]>): Parser<T[]> => {
  const func = (s: Source) => {
    let values =<T[]>[]; 
    while(true){
      const res = parser.parse(s);
      s = res.source;
      if (res.isSuccess()) {
        values = [...values,...res.value];
      }else if (res.isFailure()) {
        break;
      }
    }
    return new ParseSuccess<T[]>(s,values);
  };
  return new Parser(func);
};


const select = <T>(...parsers: Parser<T>[]): Parser<T> => {
  const func = (s: Source) => {
    for(const parser of parsers){
      const res = parser.parse(s);
      if (res.isSuccess()) return new ParseSuccess(res.source, res.value);
    }
    return new ParseFailure<T>(s);
  };
  return new Parser(func);
};

const skip = <T>(parser: Parser<T>): Parser<T> => {
  const func = (s: Source) => {
    const res = parser.parse(s);
    s = res.source;
    if(res.isFailure()) return res;
    return res.toSkip();
  }
  return new Parser(func);
};

const skipRight = <T,U>(parser: Parser<T>,parserToSkip: Parser<U>): Parser<T> => {
  const func = (s: Source) => {
    const res = parser.parse(s);
    if(res.isFailure()) return res;
    const resToSkip = parserToSkip.parse(res.source);
    if(resToSkip.isFailure()) return  new ParseFailure<T>(s);
    return res.isSuccess() ? new ParseSuccess(resToSkip.source, res.value) : res;
  }
  return new Parser(func);
};

const skipLeft = <T,U>(parserToSkip: Parser<U>,parser: Parser<T>): Parser<T> => {
  const func = (s: Source) => {
    const resToSkip = parserToSkip.parse(s);
    if(resToSkip.isFailure()) return new ParseFailure<T>(s);
    const res = parser.parse(resToSkip.source);
    return res.isFailure() ? new ParseFailure<T>(s) : res;
  }
  return new Parser(func);
};

const option = <T>(parser: Parser<T>): Parser<T> => {
  const func = (s: Source) => {
    const res = parser.parse(s);
    if (res.isFailure()) return new ParseSkip<T>(res.source);
    return res;
  }
  return new Parser(func);
};

const flat = <T>(parser: Parser<T[]>): Parser<T[]> => {
  const func = (s: Source) => {
    const res = parser.parse(s);
    s = res.source;
    if (res instanceof ParseSuccess) {
      return new ParseSuccess(s, res.value.reduce((acc:T[], val:T) => {
        if(Array.isArray(val)){
          return [...acc,...val];
        }else{
          return [...acc,val];
        }
      },<T[]>[]));
    }else {
      return res;
    }
  }
  return new Parser(func);
}

const map = <T,U>(mapFunc:(value:T) => U, parser: Parser<T>): Parser<U> => {
  const func = (s: Source) => {
    const res = parser.parse(s);
    s = res.source;
    if (res.isSuccess())   return new ParseSuccess(s, mapFunc(res.value));
    return new ParseFailure<U>(s);
  }
  return new Parser(func);
}

const combine = <T,U,R>(combineFunc:(value1:T,value2:U) => R, parser1: Parser<T>, parser2: Parser<U>): Parser<R> => {
  const func = (s: Source) => {
    const res1 = parser1.parse(s);
    if (!res1.isSuccess()) return new ParseFailure<R>(s);
    const res2 = parser2.parse(res1.source);
    if (!res2.isSuccess()) return new ParseFailure<R>(s);
    return new ParseSuccess(res2.source, combineFunc(res1.value,res2.value));
  }
  return new Parser(func);
}

const push = <T,U>(pushFunc:(parentValue:T,childValue:U) => T, parentParser: Parser<T>, childParser: Parser<U>): Parser<T> => {
  const func = (s: Source) => {
    const parentRes = parentParser.parse(s);
    if (!parentRes.isSuccess()) return new ParseFailure<T>(s);
    const childRes = childParser.parse(parentRes.source);
    if (childRes.isSuccess()){
      return new ParseSuccess(childRes.source, pushFunc(parentRes.value,childRes.value));
    }
    if (childRes.isFailure()) return new ParseFailure<T>(s);
    return new ParseSuccess(childRes.source,parentRes.value);
  }
  return new Parser(func);
}

const dummy = <T>(message="")=>{
  return new Parser((s:Source)=> new ParseFailure<T>(s,message));
}

const lazy=<T>(parserMaker:()=>Parser<T>)=>{
  const func = (s: Source) => parserMaker().parse(s);
  return new Parser(func);
}

const child = <T>(parent:Parser<T>, child:Parser<Child<T>>):Parser<T>=>{
  const func = (s: Source) => {
    const parentres = parent.parse(s);
    s = parentres.source;
    if (parentres instanceof ParseSuccess) {
      const childres = child.parse(s);
      if (childres instanceof ParseSuccess) {
        return new ParseSuccess(s, (<Child<T>>childres.value).pushTo(parentres.value));
      }else if(childres instanceof ParseSuccess){
        return parentres;
      }
    }
    return new ParseFailure<T>(s);
  }
  return new Parser(func);
}

const children = <T>(parent:Parser<T>, childparser:Parser<Child<T>[]>):Parser<T>=>{
  const func = (s: Source) => {
    const parentres = parent.parse(s);
    s = parentres.source;
    if (parentres instanceof ParseSuccess) {
      const childres = childparser.parse(s);
      if (childres instanceof ParseSuccess) {
        const parentValue = 
          (<Child<T>[]>childres.value).reduce((parent,child)=>child.pushTo(parent),parentres.value);
        return new ParseSuccess<T>(s, parentValue);
      }else if(childres instanceof ParseSuccess){
        return parentres;
      }
    }
    return new ParseFailure<T>(s);
  }
  return new Parser(func);
}

const capture = <T>(parser:Parser<T>):ParserHunter<T>=>{
  const hunter = new ParserHunter<T>();
  hunter.capture(parser);
  return hunter;
}