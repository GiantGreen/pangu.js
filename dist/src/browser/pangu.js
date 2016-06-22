'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Pangu = require('../shared/core').Pangu;

// https://developer.mozilla.org/en/docs/Web/API/Node/nodeType
var COMMENT_NODE_TYPE = 8;

var BrowserPangu = function (_Pangu) {
  _inherits(BrowserPangu, _Pangu);

  function BrowserPangu() {
    _classCallCheck(this, BrowserPangu);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(BrowserPangu).call(this));

    _this.topTags = /^(html|head|body|#document)$/i;
    _this.ignoreTags = /^(code|pre|textarea)$/i;
    _this.spaceSensitiveTags = /^(a|del|pre|s|strike|u)$/i;
    _this.spaceLikeTags = /^(br|hr|i|img|pangu)$/i;
    _this.blockTags = /^(div|h1|h2|h3|h4|h5|h6|p)$/i;
    return _this;
  }

  _createClass(BrowserPangu, [{
    key: 'canIgnoreNode',
    value: function canIgnoreNode(node) {
      var parentNode = node.parentNode;

      while (parentNode && parentNode.nodeName && parentNode.nodeName.search(this.topTags) === -1) {
        if (parentNode.getAttribute('contenteditable') === 'true' || parentNode.getAttribute('g_editable') === 'true' || parentNode.nodeName.search(this.ignoreTags) >= 0) {
          return true;
        }

        parentNode = parentNode.parentNode;
      }

      return false;
    }
  }, {
    key: 'isFirstTextChild',
    value: function isFirstTextChild(parentNode, targetNode) {
      var childNodes = parentNode.childNodes;

      // 只判斷第一個含有 text 的 node
      for (var i = 0; i < childNodes.length; i++) {
        var childNode = childNodes[i];
        if (childNode.nodeType !== COMMENT_NODE_TYPE && childNode.textContent) {
          return childNode === targetNode;
        }
      }

      // 沒有顯式地 return 就是 undefined，放在 if 裡面會被當成 false
      // return false;
    }
  }, {
    key: 'isLastTextChild',
    value: function isLastTextChild(parentNode, targetNode) {
      var childNodes = parentNode.childNodes;

      // 只判斷倒數第一個含有 text 的 node
      for (var i = childNodes.length - 1; i > -1; i--) {
        var childNode = childNodes[i];
        if (childNode.nodeType !== COMMENT_NODE_TYPE && childNode.textContent) {
          return childNode === targetNode;
        }
      }

      // 沒有顯式地 return 就是 undefined，放在 if 裡面會被當成 false
      // return false;
    }
  }, {
    key: 'spacingNodeByXPath',
    value: function spacingNodeByXPath(xPathQuery) {
      var contextNode = arguments.length <= 1 || arguments[1] === undefined ? document : arguments[1];

      // 是否加了空格
      var hasSpacing = false;

      // 因為 xPathQuery 會是用 text() 結尾，所以這些 nodes 會是 text 而不是 DOM element
      // snapshotLength 要配合 XPathResult.ORDERED_NODE_SNAPSHOT_TYPE 使用
      // https://developer.mozilla.org/en-US/docs/DOM/document.evaluate
      // https://developer.mozilla.org/en-US/docs/Web/API/XPathResult
      var textNodes = document.evaluate(xPathQuery, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

      var currentTextNode = void 0;
      var nextTextNode = void 0;

      // 從最下面、最裡面的節點開始，所以是倒序的
      for (var i = textNodes.snapshotLength - 1; i > -1; --i) {
        currentTextNode = textNodes.snapshotItem(i);

        if (this.canIgnoreNode(currentTextNode)) {
          nextTextNode = currentTextNode;
          continue;
        }

        var newText = this.spacing(currentTextNode.data);
        if (currentTextNode.data !== newText) {
          hasSpacing = true;
          currentTextNode.data = newText;
        }

        // 處理嵌套的 <tag> 中的文字
        if (nextTextNode) {
          // TODO
          // 現在只是簡單地判斷相鄰的下一個 node 是不是 <br>
          // 萬一遇上嵌套的標籤就不行了
          if (currentTextNode.nextSibling && currentTextNode.nextSibling.nodeName.search(this.spaceLikeTags) >= 0) {
            nextTextNode = currentTextNode;
            continue;
          }

          // currentTextNode 的最後一個字 + nextTextNode 的第一個字
          var testText = currentTextNode.data.toString().substr(-1) + nextTextNode.data.toString().substr(0, 1);
          var testNewText = this.spacing(testText);
          if (testNewText !== testText) {
            hasSpacing = true;

            // 往上找 nextTextNode 的 parent node
            // 直到遇到 spaceSensitiveTags
            // 而且 nextTextNode 必須是第一個 text child
            // 才能把空格加在 nextTextNode 的前面
            var nextNode = nextTextNode;
            while (nextNode.parentNode && nextNode.nodeName.search(this.spaceSensitiveTags) === -1 && this.isFirstTextChild(nextNode.parentNode, nextNode)) {
              nextNode = nextNode.parentNode;
            }

            var currentNode = currentTextNode;
            while (currentNode.parentNode && currentNode.nodeName.search(this.spaceSensitiveTags) === -1 && this.isLastTextChild(currentNode.parentNode, currentNode)) {
              currentNode = currentNode.parentNode;
            }

            if (currentNode.nextSibling) {
              if (currentNode.nextSibling.nodeName.search(this.spaceLikeTags) >= 0) {
                nextTextNode = currentTextNode;
                continue;
              }
            }

            if (currentNode.nodeName.search(this.blockTags) === -1) {
              if (nextNode.nodeName.search(this.spaceSensitiveTags) === -1) {
                if (nextNode.nodeName.search(this.ignoreTags) === -1 && nextNode.nodeName.search(this.blockTags) === -1) {
                  if (nextTextNode.previousSibling) {
                    if (nextTextNode.previousSibling.nodeName.search(this.spaceLikeTags) === -1) {
                      nextTextNode.data = ' ' + nextTextNode.data;
                    }
                  } else {
                    // dirty hack
                    if (!this.canIgnoreNode(nextTextNode)) {
                      nextTextNode.data = ' ' + nextTextNode.data;
                    }
                  }
                }
              } else if (currentNode.nodeName.search(this.spaceSensitiveTags) === -1) {
                currentTextNode.data = currentTextNode.data + ' ';
              } else {
                var panguSpace = document.createElement('pangu');
                panguSpace.innerHTML = ' ';

                // 避免一直被加空格
                if (nextNode.previousSibling) {
                  if (nextNode.previousSibling.nodeName.search(this.spaceLikeTags) === -1) {
                    nextNode.parentNode.insertBefore(panguSpace, nextNode);
                  }
                } else {
                  nextNode.parentNode.insertBefore(panguSpace, nextNode);
                }

                // TODO
                // 主要是想要避免在元素（通常都是 <li>）的開頭加空格
                // 這個做法有點蠢，但是不管還是先硬上
                if (!panguSpace.previousElementSibling) {
                  if (panguSpace.parentNode) {
                    panguSpace.parentNode.removeChild(panguSpace);
                  }
                }
              }
            }
          }
        }

        nextTextNode = currentTextNode;
      }

      return hasSpacing;
    }
  }, {
    key: 'spacingPageTitle',
    value: function spacingPageTitle() {
      var titleQuery = '/html/head/title/text()';
      var hasSpacing = this.spacingNodeByXPath(titleQuery);

      return hasSpacing;
    }
  }, {
    key: 'spacingPageBody',
    value: function spacingPageBody() {
      // // >> 任意位置的節點
      // . >> 當前節點
      // .. >> 父節點
      // [] >> 條件
      // text() >> 節點的文字內容，例如 hello 之於 <tag>hello</tag>
      //
      // [@contenteditable]
      // 帶有 contenteditable 屬性的節點
      //
      // normalize-space(.)
      // 當前節點的頭尾的空白字元都會被移除，大於兩個以上的空白字元會被置換成單一空白
      // https://developer.mozilla.org/en-US/docs/XPath/Functions/normalize-space
      //
      // name(..)
      // 父節點的名稱
      // https://developer.mozilla.org/en-US/docs/XPath/Functions/name
      //
      // translate(string, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
      // 將 string 轉換成小寫，因為 XML 是 case-sensitive 的
      // https://developer.mozilla.org/en-US/docs/XPath/Functions/translate
      //
      // 1. 處理 <title>
      // 2. 處理 <body> 底下的節點
      // 3. 略過 contentEditable 的節點
      // 4. 略過特定節點，例如 <script> 和 <style>
      //
      // 注意，以下的 query 只會取出各節點的 text 內容！
      var bodyQuery = '/html/body//*/text()[normalize-space(.)]';
      var _arr = ['script', 'style', 'textarea'];
      for (var _i = 0; _i < _arr.length; _i++) {
        var tag = _arr[_i];
        // 理論上這幾個 tag 裡面不會包含其他 tag
        // 所以可以直接用 .. 取父節點
        // ex: [translate(name(..), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz") != "script"]
        bodyQuery += '[translate(name(..),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")!="' + tag + '"]';
      }
      var hasSpacing = this.spacingNodeByXPath(bodyQuery);

      return hasSpacing;
    }

    // TODO: 改用 promise

  }, {
    key: 'spacingPage',
    value: function spacingPage() {
      var hasSpacingPageTitle = this.spacingPageTitle();
      var hasSpacingPageBody = this.spacingPageBody();

      return hasSpacingPageTitle || hasSpacingPageBody;
    }
  }, {
    key: 'spacingElementById',
    value: function spacingElementById(idName) {
      var xPathQuery = 'id("' + idName + '")//text()';

      var hasSpacing = this.spacingNodeByXPath(xPathQuery);

      return hasSpacing;
    }
  }, {
    key: 'spacingElementByClassName',
    value: function spacingElementByClassName(className) {
      var xPathQuery = '//*[contains(concat(" ", normalize-space(@class), " "), "' + className + '")]//text()';

      var hasSpacing = this.spacingNodeByXPath(xPathQuery);

      return hasSpacing;
    }
  }, {
    key: 'spacingElementByTagName',
    value: function spacingElementByTagName(tagName) {
      var xPathQuery = '//' + tagName + '//text()';

      var hasSpacing = this.spacingNodeByXPath(xPathQuery);

      return hasSpacing;
    }
  }]);

  return BrowserPangu;
}(Pangu);

var pangu = new BrowserPangu();

module.exports = pangu;