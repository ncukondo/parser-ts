import { text,seq,regexp,select,skip,many,option, Parser,ParserHunter,flat,lazy,dummy,map,children,child,seqArray,manyArray } from './parser';

const stringify = (value:any) =>{
  return JSON.stringify(value,null,2).replace(/\"/gm,"'");
}

describe('parser', () => {
    it('text()', () => {
      const res = text('test').parse('testtest').tryValue();
      expect(res).toBe('test');
    });
    it('seq()', () => {
      const res = seq(text('test'),text('test')).parse('testtest').tryValue();
      expect(res).toEqual(["test","test"]);
    });
    it('regexp()', () => {
      const value1 = regexp(/\d{4}-\d{2}/).parse('2019-11-30').tryValue();
      expect(value1).toBe('2019-11');
      const value2 = regexp(/\d{2}-\d{2}/).parse('2019-11-30').tryValue();
      expect(value2).toBe(null);
    });
    it('select()', () => {
      const value1 = select(text('value'),regexp(/\d{4}-\d{2}/)).parse('2019-11-30').tryValue();
      expect(value1).toBe('2019-11');
      const value2 = select(text('value'),regexp(/\d{4}-\d{2}/)).parse('value-2019').tryValue();
      expect(value2).toBe('value');
    });
    it('skip()', () => {
      const value = seq(skip(text('value-')),regexp(/^\d{4}/)).parse('value-2019').tryValue();
      expect(value).toEqual(["2019"]);
    });
    it('many()', () => {
      const value = many(text('hoge')).parse('hogehogehogehoge').tryValue();
      expect(value).toEqual(["hoge","hoge","hoge","hoge"]);
    });
    /*it('lazy()', () => {
      let parser;
      parser = seq(text('hoge'),option(lazy(()=>parser)));
      const value = stringify(parser.parse('hogehogehogehoge').getBlockToken());
      expect(value).toBe(LAZY_TEST_RESULT);
    });*/
    it('ParserHunter', () => {
      const hunter = new ParserHunter<string[]>();
      hunter.prey = seqArray(text('hoge').toList(),option(hunter));
      const value = hunter.parse('hogehogehogehoge').tryValue();
      expect(value).toEqual(["hoge", "hoge", "hoge", "hoge"]);
    });
    it('ParserHunter.popText() => fugafuga<a>hogehoge<i>hoge</i>hoge</a>', () => {
      const tagName = regexp(/[a-z]+/i).captureTo();
      const startTag = text('<').then(tagName).skip(text('>')).toList();
      const textNode = regexp(/[a-z]+/i).toList();
      const endTag = text('</').then(tagName.popText()).skip(text('>')).toList();
      const htmlElement = new ParserHunter<string[]>();
      const nodeContent = manyArray(textNode.or(htmlElement));
      htmlElement.prey = seqArray(startTag,nodeContent,endTag.ignore());
      const html = manyArray(textNode.or(htmlElement));
      const res1 = html.parse('fugafuga<a>hogehoge<i>hoge</i>hoge</a>');
      expect(res1.tryValue()).toEqual(["fugafuga", "a", "hogehoge", "i", "hoge", "hoge"]);
      const res2 = html.parse('<a>hogehoge<i>hoge</a>hoge</a>');
      expect(res2.tryValue()).toEqual([]);
    });
    it('map()', () => {
      const value1 = map(v=>parseInt(v),regexp(/\d{4}/)).parse('2019-11-30').tryValue();
      expect(value1).toBe(2019);
      const value2 = regexp(/\d{4}/).map(v=>parseInt(v)).parse('2019-11-30').tryValue();
      expect(value2).toBe(2019);
    });
    it('children()', () => {
      class Variant{
        public values = <Array<string>>[]
        constructor(public name:string){}
        push(value:string){
          this.values.push(value);
          return this;
        }
      }
      const variant = regexp(/[a-z]+/i).skip(text("=")).map(v=>new Variant(v));
      const child = text('hoge').asChild((v:Variant,s:string)=>v.push(s));
      const parser1 = variant.children(child.many());
      const value1 = parser1.parse("test=hogehogehogehoge").tryValue()
      expect(value1).toEqual({"name": "test", "values": ["hoge", "hoge", "hoge", "hoge"]});
    });
});
