import { Source } from './source';
export {ParseResult,ParseSuccess,ParseFailure,ParseSkip,isSuccess,isFailure,isSkip };

const isSuccess = <T>(result:any):result is ParseSuccess<T>=>{
  return result instanceof ParseSuccess;
}

const isFailure = <T>(result:any):result is ParseFailure<T>=>{
  return result instanceof ParseFailure;
}

const isSkip = <T>(result:any):result is ParseSkip<T>=>{
  return result instanceof ParseSkip;
}

abstract class ParseResult<T> {
  protected constructor(public source: Source) { }

  tryValue(){
    if (this.isSuccess()) return this.value;
    return null;
  }

  isSuccess(): this is ParseSuccess<T>{
    return isSuccess<T>(this);
  }

  isFailure(): this is ParseFailure<T>{
    return isFailure<T>(this) ;
  }

  isSkip(): this is ParseSkip<T>{
    return isSkip<T>(this);
  }

  toSkip():ParseSkip<T>{
    if(this.isSkip()) return this;
    return new ParseSkip<T>(this.source);
  }

  toFailure(message?:string):ParseFailure<T>{
    if(this.isFailure()) return this;
    return new ParseFailure<T>(this.source,message);
  }
  
}
class ParseSuccess<T> extends ParseResult<T> {
  constructor(public source: Source, private _value: T) {
    super(source);
  }

  get value():T{
    return this.getValue();
  }

  getValue():T{
    return this._value;
  }
}

class ParseSkip<T> extends ParseResult<T> {
  constructor(public source: Source, public comment = 'parse skip.') {
    super(source);
  }
}

class ParseFailure<T> extends ParseResult<T> {
  constructor(public source: Source, public message = 'parse failure.') {
    super(source);
  }
}
