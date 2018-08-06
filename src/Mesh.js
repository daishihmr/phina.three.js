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