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