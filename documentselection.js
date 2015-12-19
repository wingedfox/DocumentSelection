/**
 * DocumentSelection <https://github.com/wingedfox/DocumentSelection/>
 * Library for text operations for plain and rich text controls
 *
 *
 * @license MIT
 * @author Ilya Lebedev <ilya@lebedev.net>
 * @version 1.0.0
 */
(function(global){
    var DOM;

    //-----------------------------------------------------------------------------------------------------------------
    // RESOLVERS
    //-----------------------------------------------------------------------------------------------------------------

    /**
     * Resolver for PlainTextInput
     *
     * @param {HTMLElement} el - element to apply resolve to
     * @returns {Array[String, HTMLElement]} array of module name and element to bind module to
     */
    function PlainTextResolver (el) {
        if (!el || !el.tagName) return false;
        var module = false;
        switch (el.tagName.toLowerCase()) {
            case 'input':
                if (["button", "checkbox", "hidden", "image", "radio", "reset", "submit"].indexOf((el.type || "").toLowerCase()) > -1) return false;
            case 'textarea':
                module = "input/plain";
        }
        return [module, el];
    }

    /**
     * Resolver for RichTextInput
     *
     * @param {HTMLElement} el - element to apply resolve to
     * @returns {Array[String, HTMLElement]} array of module name and element to bind module to
     */
    function RichTextResolver (el) {
        if (!el || !el.tagName) return false;
        var module = false;
        switch (el.tagName.toLowerCase()) {
            case 'iframe':
                module = "input/rich";
                el = el.contentWindow.document.body;
                break;
            default:
                if (el.isContentEditable) {
                    module = "input/rich";
                }
        }
        return [module, el];
    }

    //-------------------------------------------------------------------------------------------------------------
    //  PRIVATES
    //-------------------------------------------------------------------------------------------------------------
    /**
     *  Resolves and patches correct input module
     *
     *  @param {HTMLElement} el - node to find input module to
     *  @returns {Object} instantiated module
     *  @throws {NoSuchModuleError} if module could not be found
     *  @scope private
     */
    function resolve (el) {
        if (!el || !el.tagName) return false;

        var module = DocumentSelection.resolvers.reduce(function (p, c) {
            // walk through all but take first result only
            return !p && c(el) || p;
        }, false);
        /*
        *  instantiate the module
        */
        var mod;
        if (module) {
            if (global.require) {
                mod = global.require(module[0]);
            }
            // fallback for non-amd modules
            if (!mod && DocumentSelection.module[module[0]]) {
                mod = DocumentSelection.module[module[0]];
            }
        }
        /*
        *  throw the exception, is method is not implemented
        */
        if (!mod)
            throw new Error ('Module could not be resolved for given element [' + el.tagName + ']');

        return new mod(module[1]);
    }

    /**
     *  Keeps scrolling on the place for browsers, those don't support this natively
     *
     *  @param {HTMLElement} el target element
     *  @param {Number} ot old scrollTop property
     *  @param {Number} ol old scrollLeft property
     *  @scope private
     */
    function keepScroll (self,el,ot,ol) {
        if (window.getSelection && 'iframe'!=el.tagName.toLowerCase()) {
            var q = self.getSelectionOffset(el)
            if (el.contentWindow) el = el.contentWindow.document.body;

            var dy = q.y-ot;
            if (dy<0)                        el.scrollTop = q.y;
            else if (dy+q.h>el.clientHeight) el.scrollTop = q.y-el.clientHeight/2;
            else                             el.scrollTop = ot;

            if (ol>q.x)                      el.scrollLeft = q.x;
            else if (ol+el.clientWidth>q.x)  el.scrollLeft = ol;
            else                             el.scrollLeft = q.x-el.clientWidth/2; 
        }
    }

    /**
     * @constructor
     */
    function DocumentSelection (el) {
        var self = this;
        var module = resolve(el);

        //---------------------------------------------------------------------------
        //  SETTERS
        //---------------------------------------------------------------------------
        /**
         *  setSelectionRange wrapper/emulator
         *
         *  @param {Number} start position
         *  @param {Number} end position
         *  @param {Boolean} related indicates calculation of range relatively to current start point
         *  @return void
         *  @scope public
         */
        self.setRange = function(start, end, related) {
            var ot = el.scrollTop
               ,ol = el.scrollLeft
            /*
            *  set range on relative coordinates
            */
            if (related) {
                var st = self.getStart(el);
                end = st+end;
                start = st+start;
            }
            if (start < 0) start = 0;
            if (end < start) end = start;

            module.setRange(start,end);

            keepScroll(self, el, ot, ol);
        }

        //---------------------------------------------------------------------------
        //  GETTERS
        //---------------------------------------------------------------------------
        /**
         *  @returns {String} text contents of the current selection
         *  @scope public
         */
        self.getSelection = module.getSelection;

        /**
         *  @returns {Array<Nuymber>} start and end selection offsets
         *  @scope public
         */
        self.getPos = module.getPos;

        /**
         *  @return {Number} selection start position
         *  @scope public
         */
        self.getStart = self.getCursorPosition = function () {
            return module.getPos()[0];
        }

        /**
         *  @return {Number} selection end position
         *  @scope public
         */
        self.getEnd = function () {
            return module.getPos()[0];
        }

        /**
         *  Method is used to caclulate pixel offsets for the selection in TextArea (other inputs are not tested yet)
         *
         *  @return {Object} {x: horizontal offset, y: vertical offset, h: height offset}
         *  @scope public
         */
        self.getSelectionOffset = module.getSelectionOffset;

        /**
         *  Method is used to return cursor context within the current "word"
         *
         *  @return {Array} 0 - part of word before the cursor, 1 - part after
         *  @scope public
         */
        self.getContext = module.getContext;


        //---------------------------------------------------------------------------
        //  MISC FUNCTIONS
        //---------------------------------------------------------------------------
        /**
         *  Insert text at cursor position
         *
         *  @param {String} text to insert
         *  @scope public
         */
        self.insertAtCursor = function (val, keep) {
            var ot = el.scrollTop
               ,ol = el.scrollLeft;
            if (!keep) {
                module.del();
            }
            var pos = module.ins(val);
            keepScroll(self, el, ot, ol);
            return pos;
        }

        /**
         *  Wraps selection with start and end text
         *
         *  @param {String} start - text at the beginnging of the selection
         *  @param {String} end - text at the end of the selection
         *  @scope public
         */
        self.wrapSelection = function (start, end) {
            var p = self.getPos();
            if (p[0] === p[1]) {
                self.insertAtCursor(start + end);
            } else {
                var ot = el.scrollTop
                   ,ol = el.scrollLeft;
                module.ins(start);
                module.setRange(p[1] + start.length, p[1] + start.length);
                module.ins(end);
                keepScroll(self, el, ot, ol);
            }
        }

        /**
         *  Deletes char at cursor position
         *
         *  @param {Boolean} delete text before (backspace) or after (del) cursor
         *  @scope public
         */
        self.deleteAtCursor = function (after) {
            if (!self.getSelection()) {
                if (after)
                    self.setRange(0,1,true);
                else
                    self.setRange(-1,0,true);
            }
            return self.deleteSelection();
        }

        /**
         *  Removes the selection, if available
         * 
         *  @scope public
         */
        self.deleteSelection = function () {
            var ol = el.scrollLeft
               ,ot = el.scrollTop
               ,ret = module.del();
            keepScroll(self, el, ot, ol);
            return ret;
        }
    }
    
    /**
     * Namespace for module registrations when no amd available
     * @type {Object}
     */
    DocumentSelection.module = {
    }

    /**
     * List of resolvers for the input modules, each resolver should be a lightweight
     * function returning either array [module_name, element] or false
     * 
     * @type {Array}
     */
    DocumentSelection.resolvers = [
        PlainTextResolver,
        RichTextResolver
    ];


    // exports to multiple environments
    if (typeof define === 'function' && define.amd) { //RequireJS
        define(["dom", function (dom) {
            DOM = dom;
            return DocumentSelection;
        });
    } else if (typeof module !== 'undefined' && module.exports) { //CommonJS
        DOM = require('dom');
        module.exports = DocumentSelection;
    } else { //browser
        DOM = global.DOM;
        global.DocumentSelection = DocumentSelection;
    }
})(this);
