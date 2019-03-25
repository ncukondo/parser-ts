export {Token,IgnoreToken};



abstract class Token<T> {
  protected constructor(protected _value:T){
  }

  protected abstract doPushTo(thisValue:T,valuePushTo:unknown):unknown;
  protected abstract doPlus(thisValue:T,appendValue:T):T;

  protected getValue():T{
    return this._value;
  }

  protected setValue(v:T){
    this._value =v;
  }

  static createIgnore<T>():IgnoreToken<T>{
    return new IgnoreToken<T>(null as any);
  }

  plus(token:Token<T>):Token<T>{
    if(this.isIgnore) return token;
    if(token.isIgnore) return this;

    this.setValue(this.doPlus(this.value,token.value));
    return this;
  };

  push(tokenToPush:Token<unknown>):Token<T>{
    if(tokenToPush.isIgnore) return this;
    this.setValue(tokenToPush.doPushTo(tokenToPush.value,this.value) as T);
    return this;
  }

  pushTo(tokenPushTo:Token<unknown>):Token<unknown>{
    if(this.isIgnore) return tokenPushTo;
    tokenPushTo.setValue(this.doPushTo(this.value,tokenPushTo.value));
    return tokenPushTo;
  }

  get value(){
    return this.getValue();
  }

  get isIgnore():boolean{
    return this instanceof IgnoreToken;
  }

  map<U>(func: ((token:Token<T>) => Token<U>)) {
    return func(this);
  }

}

class StringToken<T extends string> extends Token<T>{
  constructor(value:T){
    super(value);
  }

  protected doPushTo<U extends T[]>(thisValue:T,valuePushTo:U):T[]{
    return [...valuePushTo,thisValue];
  }
  protected doPlus(thisValue:T,appendValue:T):T{
    return thisValue+appendValue as T;
  }
}

class ArrayToken<T> extends Token<T[]>{
  constructor(value:T[]){
    super(value);
  }

  protected doPushTo<U extends T[][]>(thisValue:T[],valuePushTo:U):T[][]{
    return [...valuePushTo,thisValue];
  }
  protected doPlus(thisValue:T[],appendValue:T[]):T[]{
    return [...thisValue,...appendValue];
  }
}

class IgnoreToken<T> extends Token<T> {
  protected doPushTo<U>(thisValue:T,valuePushTo:U):U{
    return valuePushTo;
  }
  protected doPlus(thisValue:T,appendValue:T):T{
    return appendValue;
  }
}
