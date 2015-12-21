/**
 * DocumentSelection - plain text input <https://github.com/wingedfox/DocumentSelection/>
 * Extensible Library for text operations for plain and rich text controls
 *
 *
 * @license MIT
 * @author Ilya Lebedev <ilya@lebedev.net>
 * @version 1.0.0
 */
(function(global){
    var DOM;

    /**
     *  Hash of keys, bound to elements
     *
     *  @type Object
     *  @scope private
     */
    var keys = {
         'prevCalcNode' : '__prevCalcNode'
    }

    /**
     *  Module processing selection in the 'input' and 'textarea' fields
     *
     *  @param {HTMLInputElement, HTMLTextareaElement} el input element to work with
     *  @scope protected
     */
    function PlainTextInput (el) {
        var self=this;
        /**
         *  Special document node, used to calculate range offsets in Mozilla
         *
         *  @type HtmlDivElement
         *  @scope private
         */
        var offsetCalculator = null;
        /**
         *  Returns the cursor context
         *
        *  @param {Boolean} start get start or end selection position
         *  @return {Number} offset from the beginning
         *  @scope private
         */
        self.getContext = function () {
            var pos = self.getPos(el)
               ,val = el.value
               ,r1 = val.match(new RegExp("(?:.|[\\r\\n]){0,"+(pos[0]-1)+"}(?:^|\\s)","m")) || ""
               ,r2 = val.match(new RegExp("(?:.|[\\r\\n]){"+pos[0]+"}","m"))[0]
               ,r3 = val.replace(r2,"")
               ,r4 = r3.substring(0,pos[1]-pos[0])
               ,r5 = (r3.replace(r4,"")).match(/(?:\S|$)*/)
            return [r2.replace(r1,""),r4,r5];
        }
        /**
         *  Returns selection start or end position in absolute chars from the field start
         *
         *  @return {Array<Number>} start and end offsets
         *  @scope private
         */
        self.getPos = function (el) {
            var val = el.value;
            var pos = [val.length,val.length];
            if ('function' == typeof window.getSelection) {
                try {
                    pos = [el.selectionStart,el.selectionEnd];
                } catch (e) {
                }
            } else if (window.document.selection) {
                el.setActive();
                var sel = el.document.selection.createRangeCollection()[0];
                if (el.tagName.toLowerCase() == "textarea") {
                    var c = sel.duplicate();
                    c.moveToElementText(el);

                    var l = (window.opera?val:val.replace(/\r/g,"")).length;

                    c.setEndPoint('StartToEnd', sel);
                    var st = 0+l-(window.opera?c.text:c.text.replace(/\r/g,"")).length;
                    c.setEndPoint('StartToStart', sel);
                    var en = 0+l-(window.opera?c.text:c.text.replace(/\r/g,"")).length;
                    pos[0] = Math.min(st,en);
                    pos[1] = Math.max(st,en);
                } else {
                    var clone = el.createTextRange();

                    clone.setEndPoint('EndToStart', sel);
                    pos[0] = (window.opera?clone.text:clone.text.replace(/\r/g,"")).length;

                    clone.setEndPoint('EndToEnd', sel);
                    pos[1] = (window.opera?clone.text:clone.text.replace(/\r/g,"")).length;
                }
            }
            return pos;
        }
        /**
         *  Removes the selection, if available
         * 
         *  @return {String} deleted substring
         *  @scope public
         */
        self.del = function () {
            var ret = ""
               ,p = self.getPos(el)
               ,s = p[0]
               ,e = p[1];
            if (s!=e) {
                /*
                *  check for IE, because Opera uses \r\n sequence, but calculate positions correctly
                */
                var tmp = document.selection&&!window.opera?el.value.replace(/\r/g,""):el.value;
                ret = tmp.substring(s,e);
                el.value = tmp.substring(0, s)+tmp.substring(e,tmp.length);
                self.setRange(s,s);
            }
            return ret;
        }
        /**
         *  Inserts text to the textarea
         *
         *  @param {String} text to insert
         *  @return {Number} new cursor position
         *  @scope public
         */
        self.ins = function (val) {
            var ret = ""
               ,s = self.getPos(el)[0]
               ,oLen = el.value.length;
            /*
            *  check for IE, because Opera uses \r\n sequence, but calculate positions correctly
            */
            var tmp = document.selection&&!window.opera?el.value.replace(/\r/g,""):el.value;
            el.value = tmp.substring(0,s)+val+tmp.substring(s,tmp.length);
            s += el.value.length - oLen;
            self.setRange(s,s);
            return s;
        }
        /**
         *  Return contents of the current selection
         *
         *  @return {String}
         *  @scope public
         */
        self.getSelection = function () {
            var p = self.getPos(el)
               ,s = p[0]
               ,e = p[1];
            /*
            *  w/o this check content might be duplicated on delete
            */
            if (e<s) e = s;
            /*
            *  check for IE, because Opera uses \r\n sequence, but calculate positions correctly
            */
            var tmp = document.selection&&!window.opera?el.value.replace(/\r/g,""):el.value;
            return tmp.substring(s,e);
        }
        /**
         *  Sets the selection range
         *
         *  @param {Number} start position
         *  @param {Number} end position
         *  @return void
         *  @scope public
         */
        self.setRange = function (start,end) {
            if ('function' == typeof el.setSelectionRange) {
                /*
                *  for Mozilla
                */
                try {el.setSelectionRange(start, end)} catch (e) {}
                var p = self.getPos(el);
            } else {
                /*
                *  for IE
                */
                var range;
                /*
                *  just try to create a range....
                */
                range = el.createTextRange();
                el.setActive();
                range.collapse(true);
                range.moveStart("character", start);
                range.moveEnd("character", end - start);
                range.select();
            }
        }
        /**
         *  Method is used to caclulate pixel offsets for the selection in TextArea (other inputs are not tested yet)
         *
         *  @return {Object} {x: horizontal offset, y: vertical offset, h: height offset}
         *  @scope public
         */
        self.getSelectionOffset = function () {
            var range
               ,doc = DOM.getWindow(el).document;
            if ('function' == typeof el.setSelectionRange) {
                /*
                *  For Mozilla
                */
                if (!offsetCalculator) {
                    /*
                    *  create hidden td, which will 'emulate' the textarea
                    *  it's put 'below the ground', because toggling block/none is too expensive
                    */
                    offsetCalculator = doc.createElement('td');
            
                    doc.body.appendChild(offsetCalculator);
                }
                /*
                *  store the reference to last-checked object, to prevent recalculation of styles
                */
                if (offsetCalculator[keys.prevCalcNode] != el) {
                    offsetCalculator[keys.prevCalcNode] = el;
                    var cs = doc.defaultView.getComputedStyle(el, null);
                    for (var i in cs) {
                        try {if (cs[i] && 'content' != i) offsetCalculator.style[i] = cs[i];}catch(e){}
                    }
                    offsetCalculator.style.overflow = 'auto';
                    offsetCalculator.style.position = 'absolute';
                    offsetCalculator.style.visibility = 'hidden';
                    offsetCalculator.style.zIndex = '-10';
                    offsetCalculator.style.left="-10000px";
                    offsetCalculator.style.top="-10000px";
                    offsetCalculator.style.clip = "";
                    offsetCalculator.style.maxWidth = "";
                    offsetCalculator.style.maxHeight = "";
                    offsetCalculator.style.backgroundColor = 'yellow';
                }
                /*
                *  caclulate offsets to target and move div right below it
                */
                var range = doc.createRange()
                   ,val = el.value || " ";
            
                if ('input'==el.tagName.toLowerCase()) {
                    offsetCalculator.style.width = 'auto'
                    offsetCalculator.style.whiteSpace =  'nowrap';
                } else {
                    offsetCalculator.style.whiteSpace = 'off'==el.getAttribute('wrap')?"pre":"";
                }
                
                val = val.replace(/\x20\x20/g,"\x20\xa0").replace(/</g,"&lt;").replace(/>/g,"&gt").replace(/\r/g,"");
                offsetCalculator.innerHTML = ( val.substring(0,el.selectionStart-1)+"<span>"+val.substring(el.selectionStart-1,el.selectionStart)+"\xa0</span>"
                                              +val.substring(el.selectionStart)).replace(/\n/g,"<br />")
                                                                                .replace(/\t/g,"<em style=\"white-space:pre\">\t</em>")
                /*
                *  span is used to find the offsets
                */
                var span = offsetCalculator.getElementsByTagName('span')[0];
                span.style.border = '1px solid red';
                range.offsetLeft = span.offsetLeft;
                range.offsetTop = span.offsetTop;
                range.offsetHeight = span.offsetHeight;
                span = null;
            } else if (doc.selection && doc.selection.createRange) {
                /*
                *  For IE
                */
                range = doc.selection.createRange();
                /*
                *  IE does not allow to calculate lineHeight, but this check is easy
                */
                range.offsetHeight = Math.round(range.boundingHeight/(range.text.replace(/[^\n]/g,"").length+1));
                if (el.tagName && 'textarea'==el.tagName.toLowerCase()) {
                    var xy = DOM.getOffset(el)
                    range = {
                        'offsetTop' : range.offsetTop+el.scrollTop-xy.y+DOM.getBodyScrollTop(el)
                       ,'offsetLeft' : range.offsetLeft+el.scrollLeft-xy.x+DOM.getBodyScrollLeft(el)
                       ,'offsetHeight' : range.offsetHeight
                    }
                }
            }
            if (range) {
                return {'x': range.offsetLeft, 'y': range.offsetTop, 'h': range.offsetHeight};
            }
            return {'x': 0, 'y': 0, 'h': 0};
        }
    }
    
    // exports to multiple environments
    if (typeof define === 'function' && define.amd) { //RequireJS
        define(["dom"], function (dom) {
            DOM = dom;
            return PlainTextInput;
        });
    } else if (typeof module !== 'undefined' && module.exports) { //CommonJS
        DOM = require("dom");
        module.exports = PlainTextInput;
    } else { //browser
        DOM = global.DOM;
        global.DocumentSelection.module["input/plain"] =  PlainTextInput;
    }
}(this));