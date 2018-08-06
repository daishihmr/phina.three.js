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