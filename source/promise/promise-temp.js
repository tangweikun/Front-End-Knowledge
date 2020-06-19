const PENDING = "PENDING";
const FULFILLED = "FULFILLED";
const REJECTED = "REJECTED";

function Promise(fn) {
  this.status = PENDING;
  this._fulfilledQueues = []; // 成功的回调
  this._rejectedQueues = []; // 失败的回调

  // PromiseA+ 2.1
  function resolve(value) {
    if (this.status === PENDING) {
      this.status = FULFILLED;
      this.value = value;

      // 2.2.6.1 如果promise变成了fulfilled态，所有的onFulfilled回调都需要按照then的顺序执行
      this._fulfilledQueues.forEach((f) => f());
    }
  }

  function reject(reason) {
    if (this.status === PENDING) {
      this.status = REJECTED;
      this.reason = reason;

      // 2.2.6.2 如果promise变成了rejected态，所有的onRejected回调都需要按照then的顺序执行
      this._rejectedQueues.forEach((f) => f());
    }
  }

  // FIXME: try是否可以去除
  try {
    fn(resolve.bind(this), reject.bind(this));
  } catch (e) {
    reject(e);
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  //PromiseA+ 2.2.1 / PromiseA+ 2.2.5 / PromiseA+ 2.2.7.3 / PromiseA+ 2.2.7.4
  onFulfilled =
    typeof onFulfilled === "function" ? onFulfilled : (value) => value;
  onRejected =
    typeof onRejected === "function"
      ? onRejected
      : (reason) => {
          throw reason;
        };
  let self = this;
  //PromiseA+ 2.2.7
  let promise2 = new Promise((resolve, reject) => {
    if (self.status === FULFILLED) {
      //PromiseA+ 2.2.2
      //PromiseA+ 2.2.4 --- setTimeout
      setTimeout(() => {
        try {
          //PromiseA+ 2.2.7.1
          let x = onFulfilled(self.value);
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          //PromiseA+ 2.2.7.2
          reject(e);
        }
      });
    } else if (self.status === REJECTED) {
      //PromiseA+ 2.2.3
      setTimeout(() => {
        try {
          let x = onRejected(self.reason);
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    } else if (self.status === PENDING) {
      self._fulfilledQueues.push(() => {
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      });
      self._rejectedQueues.push(() => {
        setTimeout(() => {
          try {
            let x = onRejected(self.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  });
  return promise2;
};

function resolvePromise(promise2, x, resolve, reject) {
  let self = this;
  //PromiseA+ 2.3.1
  if (promise2 === x) {
    reject(new TypeError("Chaining cycle"));
  }
  if ((x && typeof x === "object") || typeof x === "function") {
    let used; //PromiseA+2.3.3.3.3 只能调用一次
    try {
      let then = x.then;
      if (typeof then === "function") {
        //PromiseA+2.3.3
        then.call(
          x,
          (y) => {
            //PromiseA+2.3.3.1
            if (used) return;
            used = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            //PromiseA+2.3.3.2
            if (used) return;
            used = true;
            reject(r);
          }
        );
      } else {
        //PromiseA+2.3.3.4
        if (used) return;
        used = true;
        resolve(x);
      }
    } catch (e) {
      //PromiseA+ 2.3.3.2
      if (used) return;
      used = true;
      reject(e);
    }
  } else {
    //PromiseA+ 2.3.3.4
    resolve(x);
  }
}

Promise.defer = Promise.deferred = function () {
  let dfd = {};
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = Promise;
