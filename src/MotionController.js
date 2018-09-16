phina.namespace(function() {

  phina.define("phina.three.MotionController", {
    superClass: "phina.accessory.Accessory",

    _beforeMotion: null,
    _currentMotion: null,

    _beforeAction: null,
    _currentAction: null,

    transitionTweener: null,

    init: function() {
      this.superInit();

      this.on("attached", e => {
        this.transitionTweener = phina.accessory.Tweener().attachTo(this.target);
        this.target._transitionWeightBefore = 0;
        this.target._transitionWeightCurrent = 0;

        this.target.animationMixer.addEventListener("finished", (e) => {
          if (this._currentMotion) this._currentMotion.flare("finished");
        });
        this.target.animationMixer.addEventListener("loop", (e) => {
          if (this._currentMotion) this._currentMotion.flare("entered");
        });
      });
    },

    switchMotion: function(newMotion, duration) {
      if (this._currentMotion === newMotion) return;

      if (this._beforeAction) {
        this._beforeAction.stop();
      }

      this._beforeMotion = this._currentMotion;
      this._beforeAction = this._currentAction;

      this._currentMotion = newMotion;

      if (newMotion._animationAction == null) {
        newMotion._animationAction = this.target.animationMixer.clipAction(newMotion._animationClip);
        if (newMotion.loop) {
          newMotion._animationAction.setLoop(THREE.LoopRepeat);
        } else {
          newMotion._animationAction.setLoop(THREE.LoopOnce);
          newMotion._animationAction.clampWhenFinished = true;
        }
      }

      this._currentAction = newMotion._animationAction;
      this._currentAction.stop();
      this._currentAction.play();
      this._currentAction.setEffectiveWeight(0);

      if (duration) {
        this.transitionTweener
          .clear()
          .set({
            _transitionWeightBefore: this.target._transitionWeightCurrent,
            _transitionWeightCurrent: 0,
          })
          .to({
            _transitionWeightBefore: 0,
            _transitionWeightCurrent: 1,
          }, duration)
          .call(() => {
            if (this._beforeAction) {
              this._beforeAction.stop();
              this._beforeAction = null;
            }
          });
      } else {
        this.target._transitionWeightBefore = 0;
        this.target._transitionWeightCurrent = 1;
        if (this._beforeAction) {
          this._beforeAction.stop();
          this._beforeAction = null;
        }
      }

      if (this._beforeMotion) this._beforeMotion.flare("exited");
      newMotion.flare("entered");
    },

    setTime: function(time) {
      this.target.animationMixer.time = 0;
      this.target.animationMixer.update(time);
      return this;
    },

    update: function(app) {
      const target = this.target;

      if (this._beforeAction) this._beforeAction.setEffectiveWeight(target._transitionWeightBefore);
      if (this._currentAction) this._currentAction.setEffectiveWeight(target._transitionWeightCurrent);

      if (this._currentMotion) this._currentMotion.update(this);

      target.animationMixer.update(app.deltaTime / 1000);
    },

  });

  phina.define("phina.three.Motion", {
    superClass: "phina.util.EventDispatcher",

    _transitions: null,
    loop: false,

    /** @type {THREE.AnimationClip} */
    _animationClip: null,

    /** @type {THREE.AnimationAction} */
    _animationAction: null,

    _timeEventListeners: null,

    init: function(animationClip) {
      this.superInit();

      this._animationClip = animationClip
      this._transitions = [];

      this._timeEventListeners = [];

      this.on("entered", e => {
        this._timeEventListeners.forEach(t => {
          t.fired = false;
        });
      });
    },

    /**
     * pattern1:
     *   addTransition(confitionObject, conditionProperty, nextMotion, duration)
     *
     * pattern2:
     *   addTransition(conditionExpression, nextMotion, duration)
     *
     * pattern3:
     *   addTransition(eventName, nextMotion, duration)
     *
     */
    addTransition: function(condition, motion, duration) {
      if (arguments.length == 4) {
        const object = arguments[0];
        const property = arguments[1];
        motion = arguments[2];
        duration = arguments[3];

        this._transitions.push({
          condition: () => object[property],
          motion: motion,
          duration: duration || 1,
        });
      } else {
        if (typeof(condition) == "function") {
          this._transitions.push({
            condition: condition,
            motion: motion,
            duration: duration || 1,
          });
        } else if (typeof(condition) == "string") {
          const flag = false;
          this.on("entered", () => flag = false);
          this.on(condition, () => flag = true);
          this._transitions.push({
            condition: () => flag,
            motion: motion,
            duration: duration || 0,
          });
        }
      }
      return this;
    },

    addTimeEventListener: function(time, listener) {
      this._timeEventListeners.push({
        time: time,
        listener: listener,
        fired: false,
      });
      return this;
    },

    at: function(time, listener) {
      return this.addTimeEventListener(time, listener);
    },

    update: function(controller) {
      if (this._animationAction) {
        this._timeEventListeners.forEach(t => {
          if (!t.fired && t.time <= this._animationAction.time * 1000) {
            t.listener.apply(this);
            t.fired = true;
          }
        });
      }

      this._transitions.forEach(t => {
        if (t.condition()) {
          controller.switchMotion(t.motion, t.duration);
          return;
        }
      });
    },

    setLoop: function(loop) {
      this.loop = loop;
      return this;
    },

  });

});