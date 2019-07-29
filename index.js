class Vue {
  constructor(options = {}) {
    // 绑定dom
    this.$el = document.querySelector(options.el);
    this.data = options.data;
    let data = this.data;
    // 代理data, 使得this能直接访问data的元素
    Object.keys(data).forEach(key => {
      this.proxyData(key);
    });
    // 事件方法
    this.methods = options.methods;
    // 需要监听的任务列表 订阅池
    this.watcherTask = {};
    // 初始化劫持监听所有数据
    this.observer(data);
    // 解析dom
    this.compile(this.$el);
  }
  proxyData(key) {
    let _this = this;
    Object.defineProperty(_this, key, {
      // 不能再定义
      configurable: false,
      // 可枚举
      enumerable: true,
      get() {
        return _this.data[key];
      },
      set(newValue) {
        _this.data[key] = newValue;
      },
    });
  }
  observer(data) {
    let _this = this;
    Object.keys(data).forEach(key => {
      let value = data[key];
      this.watcherTask[key] = [];
      Object.defineProperty(data, key, {
        configurable: false,
        enumerable: true,
        get() {
          return value;
        },
        set(newValue) {
          if (newValue !== value) {
            value = newValue;
            _this.watcherTask[key].forEach(task => {
              task.update();
            });
          }
        },
      });
    });
  }
  compile(el) {
    const nodes = el.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.nodeType === 3) {
        let text = node.textContent.trim();
        if (!text) {
          continue;
        }
        this.compileText(node, 'textContent');
      } else if (node.nodeType === 1) {
        if (node.childNodes.length > 0) {
          this.compile(node);
        }
        // 双向绑定
        if (
          node.hasAttribute('v-model') &&
          (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')
        ) {
          node.addEventListener(
            'input',
            (() => {
              let attrVal = node.getAttribute('v-model');
              this.watcherTask[attrVal].push(new Watcher(node, this, attrVal, 'value'));
              node.removeAttribute('v-model');
              return () => {
                this.data[attrVal] = node.value;
              };
            })()
          );
        }
        if (node.hasAttribute('v-html')) {
          let attrVal = node.getAttribute('v-html');
          this.watcherTask[attrVal].push(new Watcher(node, this, attrVal, 'innerHTML'));
          node.removeAttribute('v-html');
        }
        this.compileText(node, 'innerHTML');
        if (node.hasAttribute('@click')) {
          let attrVal = node.getAttribute('@click');
          node.removeAttribute('click');
          node.addEventListener('click', e => {
            this.methods[attrVal] && this.methods[attrVal].bind(this)();
          });
        }
        // v-show 渲染
        if (node.hasAttribute('v-show')) {
          let attrVal = node.getAttribute('v-show');
          if(this.data.hasOwnProperty(attrVal)){
            if(!this.data[attrVal]) {
              node.style.display = 'none';
            }
          }else {
            if(!Boolean(JSON.parse(attrVal))) {
              node.style.display = 'none';
            }
          }
        }
      }
    }
  }
  // {{}} 双花括号 模板 处理
  compileText(node, type) {
    let reg = /\{\{( ?.*? ?)\}\}/g,
      txt = node.textContent;
    if (reg.test(txt)) {
      node.textContent = txt.replace(reg, (matched, value) => {
        value = value.trim();
        let template = this.watcherTask[value] || [];
        template.push(new Watcher(node, this, value, type));
        if (value.split('.').length > 1) {
          let v = null;
          value.split('.').forEach((val, i) => {
            v = !v ? this[val] : v[val];
          });
          return v;
        } else {
          return this[value];
        }
      });
    }
  }
}

class Watcher {
  constructor(el, vm, value, type) {
    this.el = el;
    this.vm = vm;
    this.value = value;
    this.type = type;
    this.update();
  }
  update() {
    this.el[this.type] = this.vm.data[this.value];
  }
}
