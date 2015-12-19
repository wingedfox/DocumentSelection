/**
 * DocumentSelection - rich text input <https://github.com/wingedfox/DocumentSelection/>
 * Extensible Library for text operations for plain and rich text controls
 *
 *
 * @license MIT
 * @author Ilya Lebedev <ilya@lebedev.net>
 * @version 1.0.0
 */
(function(global){
    /**
     *  Module processing selection in the rich text controls
     *
     *  @scope protected
     */
    function RichTextInput (el) {
        var self=this;
        /**
         *  Returns the cursor context
         *
         *  @param {Boolean} start get start or end selection position
         *  @return {Number} offset from the beginning
         *  @scope private
         */
        self.getContext = function () {
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                var pos = self.getPos(el)
                   ,val = el.innerText || el.innerHTML.replace(/<\/?[a-z:]+[^>]*>/ig,"").replace("&nbsp;"," ")
                   ,r1 = val.match(new RegExp("(?:.|[\\r\\n]){0,"+(pos[0]-1)+"}(?:^|\\s)","m")) || ""
                   ,r2 = val.match(new RegExp("(?:.|[\\r\\n]){"+pos[0]+"}","m")) || ""
                   ,r3 = val.replace(r2,"")
                   ,r4 = r3.substring(0,pos[1]-pos[0])
                   ,r5 = (r3.replace(r4,"")).match(/(?:\S|$)*/)
                return [r2.toString().replace(r1,""),r4,r5];
            } else {
                var s1 = doc.selection.createRange()
                   ,s2 = doc.selection.createRange()
                   ,s3 = doc.selection.createRange()
                s1.moveStart("word", -1)
                s3.moveEnd("word", 1)

                return [s1.text.replace(new RegExp(RegExp.escape(s2.text)+"$"),"")
                       ,s2.text
                       ,s3.text.replace(new RegExp("^"+RegExp.escape(s2.text)),"")];
            }
        }
        /**
         *  Returns selection start or end position in absolute chars from the field start
         *
         *  @return {Number} offset from the beginning
         *  @scope private
         */
        self.getPos = function () {
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            var pos = [0,0];
            if ('function' == typeof win.getSelection) {
                /*
                *  we need to calculate both start and end points, because range could be reversed
                *  but we can't move selection end point before start one
                */
                var sel = win.getSelection()
                   ,sn = sel.anchorNode
                   ,so = sel.anchorOffset
                   ,en = sel.focusNode
                   ,eo = sel.focusOffset
                   ,ss = false
                   ,es = false
                   ,sc = 0
                   ,ec = 0
                   ,cn
                   ,tw = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);

                while (sn && sn.nodeType != 3) {
                    sn = sn.childNodes[so]
                    so = 0;
                }
                while (en && en.nodeType != 3) {
                    en = en.childNodes[eo]
                    eo = 0;
                }
                while (cn = tw.nextNode()) {
                    if (cn == en) {
                        ec += eo
                        es = true
                    }
                    if (cn == sn) {
                        sc += so
                        ss = true
                    }
                    if (!es) ec += cn.nodeValue.length
                    if (!ss) sc += cn.nodeValue.length
                    if (es && ss) break;
                }
                pos = [Math.min(ec,sc),Math.max(ec,sc)]
            } else {
                el.setActive();
                pos = [Math.abs(doc.selection.createRange().moveStart("character", -100000000))
                      ,Math.abs(doc.selection.createRange().moveEnd("character", -100000000))];
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
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                var s = win.getSelection()
                   ,i = s.rangeCount
                while (--i>-1) s.getRangeAt(i).deleteContents();

                /*
                *  insert empty text node for browsers that loose selection, when it's empty
                */
                var r = s.getRangeAt(s.rangeCount-1)
                r.insertNode(doc.createTextNode(""))
                s.addRange(r);
            } else if (doc && doc.selection) {
                doc.selection.createRange().text = "";
                doc.selection.createRange().select();
            }
        }

        /**
         *  Inserts text
         *
         *  @param {String} text to insert
         *  @scope public
         */
        self.ins = function (val) {
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                val = val.replace(/&/,"&amp;").replace(/</,"&lt;").replace(/>/,"&gt;").replace(/\x20/,"&nbsp;").replace(/[\r\n]/,"<br />");
                var n = doc.createElement('span')
                   ,s = win.getSelection()
                   ,r = s.getRangeAt(0)
                   ,ln;
                n.innerHTML = val;
                r.insertNode(n);
                r.selectNodeContents(n);
                
                var pn = n.parentNode
                   ,ln = n.nextSibling

                /*
                *  replace holder node with the extracted document fragment
                */
                n.parentNode.replaceChild(r.extractContents(),n);

                /*
                *  if there's no last child, attempt to set range after the last child in the node
                */
                if (!ln)
                    ln = pn.lastChild;

                var r1 = doc.createRange();
                /*
                *  if last node is text node
                */
                if (ln.nodeValue) {
                    /*
                    *  move selection to the very beginning of this node
                    */
                    r1.setStart(ln,0);
                } else {
                    /*
                    *  otherwise, move selection after the newly created node,
                    *  it's actual when creating line breaks
                    */
                    r1.setStartAfter(ln);
                }

                /*
                *  remove any existing selection
                *  and create the new one
                */
                s.removeAllRanges();
                s.addRange(r1);

            } else if (doc && doc.selection) {
                el.setActive();
                var r = doc.selection.createRange();
                r.text = val;
                /*
                *  move selection only if there's a space to move it
                */
                if (r.moveStart("character", 1)) {
                    r.moveStart("character", -1);
                    r.moveEnd("character", -1);
                    r.select();
                }
            }
            return self.getPos(el)[0];
        }

        /**
         *  Return contents of the current selection
         *
         *  @return {String}
         *  @scope public
         */
        self.getSelection = function () {
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                var s = win.getSelection();
                return s?s.toString():"";
            } else if (doc && doc.selection) {
                return doc.selection.createRange().text;
            }
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
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                var sel = win.getSelection();
                sel.removeAllRanges();
                var r = doc.createRange()
                   ,cnt = 0
                   ,cl = 0
                   ,cn
                   ,pn
                   ,tw = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
            
                /*
                *  move start position to the very beginning of the first non-empty text node ( <= in the expression),
                *  it's actual when the actual selection is at the very beginning of the text node
                *  otherwise, selection will be started from the end of some previous node,
                *  this could lead to deletion of the intermediate non-text content
                */
                while ((cn=tw.nextNode())&&(!cn.nodeValue.length||(cnt+cn.nodeValue.length <= start))) {
                    pn = cn;
                    cnt += cn.nodeValue.length;
                }
                /*
                *  explicitly set range borders
                */
                if (cn||(cn=pn)) {
                    r.setStart(cn,start-cnt);
                    r.setEnd(cn,start-cnt);
                }
                if (cn) {
                    do {
                        if (cn.nodeType != 3) continue;
                        if (cnt+cn.nodeValue.length < end) {
                            cnt += cn.nodeValue.length;
                        } else {
                            r.setEnd(cn,end-cnt);
                            break;
                        }
                    } while (cn=tw.nextNode())
                }
                sel.addRange(r);
            } else if (doc && doc.selection) {
                el.setActive();
                var r = doc.selection.createRange()
                r.moveToElementText(el);
                r.move("character",start);
                r.moveEnd("character",end-start);
                r.select();
            }
        }

        /**
         *  Method is used to calculate pixel offsets for the selection in TextArea (other inputs are not tested yet)
         *
         *  @return {Object} {x: horizontal offset, y: vertical offset, h: height offset}
         *  @scope public
         */
        self.getSelectionOffset = function () {
            var off = {'x':0, 'y':0, 'h':0};
            // get reference to the document and window
            var doc = el.ownerDocument;
            var win = doc.defaultView || doc.parentWindow;

            if ('function' == typeof win.getSelection) {
                var r = win.getSelection().getRangeAt(0)
                   ,s = doc.createElement('span')
                   ,contents = r.cloneContents()
                   ,e = r.endOffset
                   ,n = s;

                s.style.borderLeft='1px solid red';
                r.surroundContents(s);
                off.h = n.offsetHeight;
                while (n.offsetParent) {
                    off.x += n.offsetLeft;
                    off.y += n.offsetTop;
                    n = n.offsetParent
                }
                s.parentNode.removeChild(s);

                var r1 = doc.createRange()
                if (contents.childNodes.length>0) {
                    for (var i=0;i<contents.childNodes.length;i++) {
                        var n = contents.childNodes[i];
                        r.insertNode(n);
                        r1.selectNode(n);
                    }
                    win.getSelection().addRange(r1);
                }
            } else if (doc && doc.selection) {
                var r = doc.selection.createRange()
                off.h = r.boundingHeight
                off.x = r.offsetLeft;
                off.y = r.offsetTop;
            }
            return off;
        }
    }
    
    // exports to multiple environments
    if (typeof define === 'function' && define.amd) { //RequireJS
        define(function () { return RichTextInput; });
    } else if (typeof module !== 'undefined' && module.exports) { //CommonJS
        module.exports = RichTextInput;
    } else { //browser
        global.DocumentSelection.module["input/rich"] =  RichTextInput;
    }
}(this));