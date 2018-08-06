phina.namespace(function() {

  phina.define("phina.three.Mesh", {
    superClass: "phina.three.Object3D",

    colliders: null,

    init: function(options) {
      if (typeof(options.$t) == "string") {
        this.assetName = options.$t;
        const orig = phina.asset.AssetManager.get("mesh", this.assetName);

        options.$t = orig.clone();
        if (options.$t) {
          this.colliders = orig.colliders.map((collider) => {
            collider = collider.clone();
            options.$t.add(collider);
            return collider;
          });
        } else {
          throw new Error("Mesh Asset " + this.assetName + " not found");
        }
      } else {
        this.colliders = [];
      }

      options = ({}).$safe(options, {});

      this.superInit(options);

      this.colliders.forEach((collider) => {
        collider.visible = false;
      });
    },

  });

  const matrix = new THREE.Matrix4();
  matrix.makeRotationFromEuler(new THREE.Euler(Math.PI * 0.5, Math.PI, 0));

  phina.define("phina.three.MeshAssetLoader", {
    superClass: "phina.asset.Asset",

    _static: {
      materialCache: {},
    },

    init: function() {
      this.superInit();
    },

    _load: function(resolve) {
      const loader = new THREE.ObjectLoader();
      loader.load(this.src, loadedObject => {
        let mesh = null;
        const colliders = [];

        loadedObject.traverse(child => {
          if (child.isMesh) {

            if (!child.name.startsWith("collider.")) {
              // three.jsエクスポータのバグ？
              child.geometry.applyMatrix(matrix);
              mesh = child;
            } else {
              child.material.wireframe = true;
              colliders.push(child);
            }
          }

        });

        if (mesh) {
          mesh.colliders = colliders;
          resolve(mesh);
        }
      });
    },
  });
  phina.asset.AssetLoader.register("mesh", (key, path) => phina.three.MeshAssetLoader().load(path));

});
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

        this.target.$t.mixer.addEventListener("finished", (e) => {
          if (this._currentMotion) this._currentMotion.flare("finished");
        });
        this.target.$t.mixer.addEventListener("loop", (e) => {
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

      if (newMotion._action == null) {
        newMotion._action = this.target.$t.mixer.clipAction(newMotion._clip);
        if (newMotion.loop) {
          newMotion._action.setLoop(THREE.LoopRepeat);
        } else {
          newMotion._action.setLoop(THREE.LoopOnce);
          newMotion._action.clampWhenFinished = true;
        }
      }

      this._currentAction = newMotion._action;
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
      this.target.$t.mixer.time = 0;
      this.target.$t.mixer.update(time);
      return this;
    },

    update: function(app) {
      const target = this.target;

      if (this._beforeAction) this._beforeAction.setEffectiveWeight(target._transitionWeightBefore);
      if (this._currentAction) this._currentAction.setEffectiveWeight(target._transitionWeightCurrent);

      if (this._currentMotion) this._currentMotion.update(this);

      target.$t.mixer.update(app.deltaTime / 1000);
    },

  });

  phina.define("phina.three.Motion", {
    superClass: "phina.util.EventDispatcher",

    _transitions: null,
    loop: false,

    _clip: null,
    _action: null,

    _timeEventListeners: null,

    init: function(clip) {
      this.superInit();

      this._clip = clip
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
      if (this._action) {
        this._timeEventListeners.forEach(t => {
          if (!t.fired && t.time <= this._action.time * 1000) {
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
phina.namespace(function() {

  phina.define("phina.three.Object3D", {
    superClass: "phina.app.Element",

    $t: null,

    init: function(options) {
      this.superInit();
      options = ({}).$safe(options, {
        position: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Euler(),
        visible: true,
      });

      this.$t = options.$t;

      this.position.copy(options.position);
      this.scale.copy(options.scale);
      this.rotation.copy(options.rotation);
      this.visible = options.visible;
      this._position2d = new THREE.Vector2();
    },

    setPosition: function(x, y, z) {
      this.position.set(x, y, z);
      return this;
    },

    setScale: function(sx, sy, sz) {
      sy = (sy !== undefined) ? sy : sx;
      sz = (sz !== undefined) ? sz : sx;
      this.scale.set(sx, sy, sz);
      return this;
    },

    setRotationX: function(v) {
      this.rotationX = v;
      return this;
    },
    setRotationY: function(v) {
      this.rotationY = v;
      return this;
    },
    setRotationZ: function(v) {
      this.rotationZ = v;
      return this;
    },

    _accessor: {
      position2d: {
        get: function() {
          this._position2d.x = this.$t.position.x;
          this._position2d.y = this.$t.position.z;
          return this._position2d;
        },
      },
      position: {
        get: function() {
          return this.$t.position;
        },
      },
      scale: {
        get: function() {
          return this.$t.scale;
        },
      },
      rotation: {
        get: function() {
          return this.$t.rotation;
        },
      },
      quaternion: {
        get: function() {
          return this.$t.quaternion;
        },
      },
      matrix: {
        get: function() {
          return this.$t.matrix;
        },
      },
      x: {
        get: function() {
          return this.$t.position.x;
        },
        set: function(v) {
          this.$t.position.x = v;
        },
      },
      y: {
        get: function() {
          return this.$t.position.y;
        },
        set: function(v) {
          this.$t.position.y = v;
        },
      },
      z: {
        get: function() {
          return this.$t.position.z;
        },
        set: function(v) {
          this.$t.position.z = v;
        },
      },
      scaleX: {
        get: function() {
          return this.$t.scale.x;
        },
        set: function(v) {
          this.$t.scale.x = v;
        },
      },
      scaleY: {
        get: function() {
          return this.$t.scale.y;
        },
        set: function(v) {
          this.$t.scale.y = v;
        },
      },
      scaleZ: {
        get: function() {
          return this.$t.scale.z;
        },
        set: function(v) {
          this.$t.scale.z = v;
        },
      },
      rotationX: {
        get: function() {
          return this.$t.rotation.x;
        },
        set: function(v) {
          this.$t.rotation.x = v;
        },
      },
      rotationY: {
        get: function() {
          return this.$t.rotation.y;
        },
        set: function(v) {
          this.$t.rotation.y = v;
        },
      },
      rotationZ: {
        get: function() {
          return this.$t.rotation.z;
        },
        set: function(v) {
          this.$t.rotation.z = v;
        },
      },
      visible: {
        get: function() {
          return this.$t.visible;
        },
        set: function(v) {
          this.$t.visible = v;
        },
      },
    },

  });

});
phina.namespace(function() {


  phina.define("phina.three.SkinnedMesh", {
    superClass: "phina.three.Mesh",

    _motionCache: null,
    centerPosition: null,

    init: function(options) {
      if (typeof(options.$t) == "string") {
        this.assetName = options.$t;
        options.$t = phina.asset.AssetManager.get("skinned", this.assetName).clone();
      }

      this.superInit(options);

      this.$t.mixer = new THREE.AnimationMixer(this.$t);
      this._motionCache = {};
    },

    createMotion: function(indexOrName) {
      let clip = typeof(indexOrName) == "number" ? this.$t.geometry.animations[indexOrName] : THREE.AnimationClip.findByName(this.$t, indexOrName);
      return Motion(clip);
    },

    getMotion: function(indexOrName) {
      if (this._motionCache[indexOrName] == null) {
        let clip = typeof(indexOrName) == "number" ? this.$t.geometry.animations[indexOrName] : THREE.AnimationClip.findByName(this.$t, indexOrName);
        this._motionCache[indexOrName] = Motion(clip);
      }
      return this._motionCache[indexOrName];
    },

    playDefaultMotion: function(name) {
      const motion = name ? this.getMotion(name).setLoop(true) : this.getMotion(0).setLoop(true);
      this.motionController.switchMotion(motion);
    },

    _accessor: {
      motionController: {
        get: function() {
          if (this._motionController == null) {
            this._motionController = phina.three.MotionController().attachTo(this);
          }
          return this._motionController;
        },
      },
    },

  });

  phina.define("phina.three.SkinnedAsset", {
    superClass: "phina.asset.Asset",

    init: function() {
      this.superInit();
    },

    _load: function(resolve) {
      const url = this.src;

      const loader = new THREE.ObjectLoader();
      loader.load(url, (loaded) => {
        loaded.traverse((child) => {
          if (child instanceof THREE.SkinnedMesh) {
            resolve(child);
          }
        });
      });
    },
  });
  phina.asset.AssetLoader.register("skinned", (key, src) => phina.three.SkinnedAsset().load(src));

});
//# sourceMappingURL=phina.three.js.map
