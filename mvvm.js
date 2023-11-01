/**
 * Vue构造函数,生成实例
 * @param {Object 配置} options 
 */
function Vue(options = {}) {
  // 将所有属性挂载到 vm.$options
  this.$options = options
  // this._data => vm._data
  let data = this._data = this.$options.data
  // 数据劫持,为每个属性添加 get set 方法
  observe(data)
  // 数据代理,将 this._data 代理到 this => vm
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      Object.defineProperty(this, key, {
        enumerable: true,
        get() {
          return this._data[key]
        },
        set(val) {
          this._data[key] = val
        }
      })
    }
  }
  initCmoputed.call(this)
  new Compiler(options.el, this)
}
/**
 * 初始化计算属性
 */
function initCmoputed() {
  let vm = this
  let computed = this.$options.computed
  Object.keys(computed).forEach(key => {
    Object.defineProperty(vm, key, {
      get: typeof computed[key] === 'function' ? computed[key] : computed[key].get,
      set() {}
    })
  })
}

/**
 * 模板编译构造函数
 * @param {Object Dom 元素} el 
 * @param {Object 实例对象} vm 
 */
function Compiler(el, vm) {
  vm.$el = document.querySelector(el)
  let fragment = document.createDocumentFragment()
  let child
  // 将 dom 元素存到内存中
  while (child = vm.$el.firstChild) {
    fragment.appendChild(child)
  }
  child = null

  replace(fragment)

  function replace(fragment) {
    Array.from(fragment.childNodes).forEach(node => {
      let text = node.textContent
      let reg = /\{\{(.*)\}\}/
      // 替换文本节点内的模板
      if (node.nodeType === 3 && reg.test(text)) {
        // a.name => [a,name]
        // console.log(RegExp.$1)
        let arr = RegExp.$1.split('.')
        // console.log(arr)
        let val = vm
        // this.a this.a.name
        arr.forEach(k => {
          val = val[k]
        })
        new Watcher(vm, RegExp.$1, function (newVal) {
          node.textContent = text.replace(reg, newVal)
        })
        node.textContent = text.replace(reg, val)
      }
      if (node.nodeType === 1) {
        let nodeAttrs = node.attributes
        Array.from(nodeAttrs).forEach(attr => {
          let name = attr.nodeName
          let exp = attr.nodeValue
          if (name.startsWith('v-')) {
            node.value = vm[exp]
          }
          new Watcher(vm, exp, newVal => {
            node.value = newVal
          })
          node.addEventListener('input', e => {
            let newVal = e.target.value
            vm[exp] = newVal
          })
        })
      }
      // 替换节点内的子节点内容
      if (node.childNodes) {
        replace(node)
      }
    })
  }
  // 将处理过的 dom 元素添加回页面
  vm.$el.appendChild(fragment)
}

/**
 * 劫持数据构造函数
 * 观察对象,通过 Object.defineProperty 给对象添加属性
 * @param {Object 数据} data 
 */
function Observe(data) {
  let sub = new Subscribe
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      let val = data[key]
      observe(val)
      Object.defineProperty(data, key, {
        enumerable: true,
        get() {
          // 订阅
          Subscribe.target && sub.add(Subscribe.target)
          return val
        },
        set(newVal) {
          if (newVal === val) {
            return
          }
          // 用新值覆盖老值
          val = newVal
          // 使赋的新值,也具有get set
          observe(newVal)
          // 执行
          sub.notify()
        }
      })
    }
  }
}
/**
 * 劫持数据函数
 * @param {Object 数据} data 
 */
function observe(data) {
  // 不是对象就返回
  if (!data || typeof data !== 'object') {
    return
  }
  return new Observe(data)
}

// 订阅
function Subscribe() {
  this.subs = []
}
Subscribe.prototype.add = function (sub) {
  this.subs.push(sub)
}
Subscribe.prototype.notify = function () {
  this.subs.forEach(sub => sub.update())
}

// 观察,发布
function Watcher(vm, exp, fn) {
  this.vm = vm
  this.exp = exp
  this.fn = fn
  Subscribe.target = this
  let val = vm
  let arr = exp.split('.')
  arr.forEach(k => val = val[k])
  Subscribe.target = null
}
Watcher.prototype.update = function () {
  let val = this.vm
  let arr = this.exp.split('.')
  arr.forEach(k => val = val[k])
  this.fn(val)
}