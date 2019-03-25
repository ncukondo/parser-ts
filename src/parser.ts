import { Source } from './source';
import {text,seq,skip,many,option,map,children, child,select,skipRight,skipLeft,dummy} from './parse-functions'
import { ParseResult, ParseSuccess, ParseSkip, ParseFailure } from './parse-result';
export * from './source';
export * from './parse-functions';
export {Parser, parserFunction,Child};

type parserFunction<T> = (s:Source)=>ParseResult<T>;

class Child<T>{
  constructor(private _pushFunc:(parentValue:T)=>T){}
  pushTo(parentValue:T):T{
    return this._pushFunc(parentValue);
  }
}

class Parser<T>{
  constructor(protected _parseFunction: parserFunction<T>){}

  parse(s:Source):ParseResult<T>;
  parse(s:string):ParseResult<T>;
  parse(s:(Source | string)):ParseResult<T>{
    if(s instanceof Source){
      return this.doParse(s,this.parseFunction);
    }else{
      return this.doParse(new Source(s),this.parseFunction);
    }
  };

  protected set parseFunction(parserFunc:parserFunction<T>){
    this._parseFunction = parserFunc;
  }

  protected get parseFunction(){
    return this._parseFunction;
  }
  
  protected doParse(s:Source, parseFunction: parserFunction<T>):ParseResult<T>{
    const res = parseFunction(s);
    return res;
  }

  clone(){
    return new Parser(this._parseFunction);
  }

  skip<U>(parser:Parser<U>){
    return skipRight<T,U>(this,parser);
  }

  then<U>(parser:Parser<U>){
    return skipLeft<U,T>(this,parser);
  }

  ignore(){
    return skip<T>(this);
  }

  or(...parsers: Parser<T>[]){
    return select<T>(this,...parsers);
  }

  toList(){
    return this.map(v=>[v]);
  }

  asChild<P>(pushFunc:(parentValue:P,thisValue:T)=>P):Parser<Child<P>>{
    return this.map(value=>
      new Child<P>((parentValue:P)=>pushFunc(parentValue,value))
    );
  }

  captureTo(hunter?:ParserHunter<T>){
    if(hunter)return hunter.capture(this);
    return new ParserHunter<T>().capture(this);
  }

  tap(func:(res:ParseResult<T>)=>void){
    const parsefunc = (s: Source) => {
      const res = this.parse(s);
      func(res);
      return res;
    };
    return new Parser(parsefunc);
  }

  many(){
    return many<T>(this);
  }

  option(){
    return option<T>(this);
  }

  map<U>(mapFunc:(value:T)=>U){
    return map<T,U>(mapFunc,this);
  }

  child(childParser:Parser<Child<T>>){
    return child<T>(this,childParser);
  }

  children(childParser:Parser<Child<T>[]>){
    return children<T>(this,childParser);
  }
} 

export class ParserHunter<T> extends Parser<T>{
  private _captureValue: (T | null)=null;
  private _captureStack : T[] = [];

  constructor(){
    super((s:Source) => new ParseFailure<T>(s,'Used before hunt.'));
  }

  set prey(parser: Parser<T>) {
    this.capture(parser);
  }

  capture(parser: Parser<T>) {
    this.parseFunction = (s: Source) => {
      const res = parser.parse(s);
      if(res.isSuccess()){ 
        this._captureValue = res.value;
        this._captureStack.push(res.value);
      }
      return res;
    };
    return this;
  }

  private get textValue() {
    let text = '';
    const value = this.value;
    if (value) {
      if (typeof value === 'string') {
        text = value;
      }
      else if ('toString' in value) {
        text = value.toString();
      }
    }
    return text;
  }

  toText(value:T | null | undefined) {
    let text = '';
    if (value) {
      if (typeof value === 'string') {
        text = value;
      }
      else if ('toString' in value) {
        text = value.toString();
      }
    }
    return text;
  }

  private get value() {
    return this._captureValue || null as unknown as T;
  }
  
  popText() {
    return new Parser((s: Source) => {
      const textValue = this.toText(this._captureStack.pop());
      return (textValue && text(textValue) || dummy<string>("Captured stack is empty.")).parse(s)
    });
  }

}


