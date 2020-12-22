import * as THREE from 'three';
import FBXLoader from "three-fbx-loader";
import {AxisDummy} from "./axisdummy";
import {RobotDummy} from "./robotdummy";
import {setMatrixFromArray} from "./utils";
import EventEmitter from 'eventemitter3';
import {Path} from "./path";
import {MotionVisualization} from "./motionvisualization";

window.THREE = THREE;
import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader';

function distanceBetween(j1, j2){
    return j1.distanceTo(j2);
}

function radians (angle) {
  return angle * (Math.PI / 180);
}


/**
 * @desc this class will hold functions for the THREEjs view
 * examples include createNewPath(), moveSelectedCheckpoint(), activateCheckpointMode(), showCheckpointArrows()
 * @author Anna Fuste
 * @required eventemitter3, three, three-fbx-loader, axisdummy.js, robotdummy.js, utils.js, path.js, motionvisualization.js
 */
export class KineticARView extends EventEmitter{
    constructor(){

        super();

        this.scene = new THREE.Scene();

        this.rendererWidth = screen.height;
        this.rendererHeight = screen.width;
        let aspectRatio = this.rendererWidth / this.rendererHeight;

        this.camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, Number.MAX_VALUE );
        this.camera.matrixAutoUpdate = false;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize( this.rendererWidth, this.rendererHeight );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.previousMouseY = 0;

        // create a parent 3D object to contain all the three js objects
        // we can apply the marker transform to this object and all of its
        // children objects will be affected
        this.groundPlaneContainerObj = new THREE.Object3D();
        this.groundPlaneContainerObj.matrixAutoUpdate = false;
        this.scene.add(this.groundPlaneContainerObj);

        this.robotDummy = new AxisDummy("X", false);                                                                      // Object overlaid on object target when tracked
        this.robotDummy.matrixAutoUpdate = false;
        this.scene.add( this.robotDummy );

        this.dummy_anchor = null;                                                                                       // Robot Anchor to Ground Plane

        this.J1 = null;
        this.J2 = null;
        this.J3 = null;
        this.J4 = null;
        this.J5 = null;
        this.J6 = null;
        this.ringsMade = false;
        this.J1Angle = 0;
        this.J2Angle = 0;
        this.J3Angle = 0;
        this.J4Angle = 0;
        this.J5Angle = 0;
        this.J6Angle = 0;
        /*this.J3World = new THREE.Vector3();
        this.BaseWorld = new THREE.Vector3();
        this.RotMatrix = new THREE.Matrix3();
        this.temp = new AxisDummy();
        this.RotMatrix.set( 0, 1, 0,
                            -1, 0, 0,
                            0, 0, 1);*/

        this.dummy_groundPlaneOrigin = this.robotDummy.clone();                                                         // Ground Plane Origin
        this.scene.remove(this.dummy_groundPlaneOrigin);
        this.groundPlaneContainerObj.add(this.dummy_groundPlaneOrigin);
        this.dummy_groundPlaneOrigin.position.set(0,0,0);

        this.dummy_occlusion = new RobotDummy();                                                                        // Realtime robot object from physical robot
        this.dummy_occlusion.matrixAutoUpdate = false;
        //this.groundPlaneContainerObj.add(this.dummy_occlusion);
        this.dummy_occlusion.position.set(0,0,0);
        this.dummy_occlusion.updateMatrix();

        /*
        // Phone pointer on surface
        this.dummy_phonePointer = new SurfaceMarker();
        this.groundPlaneContainerObj.add(this.dummy_phonePointer);
        this.dummy_phonePointer.position.set(0,0,0);
        */

        // this.scene.add( new THREE.AmbientLight( 0x333333 ) );
        this.scene.add(new THREE.HemisphereLight(0xffffff, 1.5));

        this.motionViz = new MotionVisualization(this.groundPlaneContainerObj);

        this.counter = 0;

        this.isProjectionMatrixSet = false;
        this.isGroundPlaneTracked = false;
        this.isRobotAnchorSet = false;

        this.lastPosition = new THREE.Vector3(0,0,0);                                                          // Last position to compute path
        this.lastDirection = new THREE.Vector3(1,1,1);                                                         // Last direction to compute path

        this.paths = [];                                                                                                // List with all path objects
        this.currentPath = null;

        // Load FBX model for checkpoints base
        const fbxloader = new FBXLoader();
        this.checkpointbaseFloating = null;
        this.checkpointbaseGrounded = null;

        fbxloader.load( 'assets/models/KineticAR_Locator_01.fbx',  ( object ) => {                          // Only load FBX once
            this.checkpointbaseFloating = object.getObjectByName( "LOCATOR___FLOATINGModel" );
            this.checkpointbaseGrounded = object.getObjectByName( "LOCATOR___GROUNDEDModel" );
            console.log('FBX LOADED');
        });

        this.fanuc_robot = new THREE.Group();
        this.fanuc_gltf = new THREE.Group();
        this.fanuc_j1 = new THREE.Group();
        this.fanuc_j2 = new THREE.Group();
        this.fanuc_j3 = new THREE.Group();
        this.fanuc_j4 = new THREE.Group();
        this.fanuc_j5 = new THREE.Group();
        this.fanuc_j6 = new THREE.Group();
        this.base = new THREE.Group();

        this.fanuc_gltf2 = new THREE.Group();
        this._j1 = new THREE.Group();
        this._j2 = new THREE.Group();
        this._j3 = new THREE.Group();
        this._j4 = new THREE.Group();
        this._j5 = new THREE.Group();
        this._j6 = new THREE.Group();
        this._base = new THREE.Group();
        this.j1axis = new THREE.AxesHelper( 100 );
        this.fanuc_array = new Array();

        this.j1_angles = new Array(-179, 179);
        this.j1_axis   = new THREE.Vector3(0,0,1);

        this.j2_angles = new Array(-120, 60);
        this.j2_axis   = new THREE.Vector3(0,1,0);

        this.j3_angles = new Array(-60, 60);
        this.j3_axis   = new THREE.Vector3(0,1,0);

        this.j4_angles = new Array(-120, 120);
        this.j4_axis   = new THREE.Vector3(1,0,0);

        this.j5_angles = new Array(-179, 179);
        this.j5_axis   = new THREE.Vector3(0,1,0);

        this.j6_angles = new Array(0, 0);
        this.j6_axis = new THREE.Vector3(0,0,0);

        this.fanuc_angles = new Array(this.j1_angles, this.j2_angles, this.j3_angles, this.j4_angles, this.j5_angles);
        this.fanuc_axes   = new Array(this.j1_axis, this.j2_axis, this.j3_axis, this.j4_axis, this.j5_axis);

        this.move_robot = false;
        const fanucloader = new THREE.GLTFLoader();
        // const fanucloader2 = new THREE.GLTFLoader();
        // fanucloader2.load(
        //     // resource URL
        //     'assets/models/Full_FANUC.gltf',
        //     ( gltf ) => {
        //         this.fanuc_gltf2 = gltf.scene;
        //         this.scene.add(this.fanuc_gltf2);
        //         this.fanuc_gltf2.position.set(0,0,0);
        //         this.fanuc_gltf2.scale.set(200,200,200);
        //         console.log(this.fanuc_gltf2);
        //     },
        //     // called while loading is progressing
        //     function ( xhr ) {

        //         console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        //     },
        //     // called when loading has errors
        //     function ( error ) {

        //         console.log( error );

        //     }
        // );

        fanucloader.load(
            // resource URL
            'assets/models/fanuc_normal.gltf',
            ( gltf ) => {
                this.fanuc_gltf = gltf.scene;
                // this.scene.add(this.fanuc_gltf);
                // this.dummy_anchor.add(this.fanuc_gltf);
                // this.fanuc_gltf.position.set(0,0,0);
                // this.fanuc_gltf.scale.set(200,200,200);
                // full_fanuc = gltf.scene.clone().children[0];
                // this.fanuc_gltf = gltf.scene.clone(false);
                // full_fanuc.children = [];
                gltf.scene.traverse((child) => {
                    if (child.name === 'Full_FANUC'){
                        this.fanuc_gltf = child;
                        // this.fanuc_gltf.children = [];
                    }

                    if (child.name === 'occurrence_of_J5J6'){
                        this.fanuc_j5 = child;
                    }

                    if (child.name === 'occurrence_of_J2J3'){
                        this.fanuc_j2 = child;
                    }
                    if (child.name === 'occurrence_of_J1J2'){
                        this.fanuc_j1 = child;
                    }

                    if (child.name === 'occurrence_of_J3J4'){
                        this.fanuc_j3 = child;
                    }
                    if (child.name === 'occurrence_of_BaseJ1'){
                        this.base = child;
                    }
                    if (child.name === 'occurrence_of_J6End'){
                        this.fanuc_j6 = child;
                    }
                    if (child.name === 'occurrence_of_J4J5'){
                        this.fanuc_j4 = child;
                    }

                });

                // this.scene.add(this.fanuc_gltf);
                // this.scene.add(this.base)
                // this.scene.add(this.fanuc_j1);
                // this.scene.add(this.fanuc_j2);
                // this.scene.add(this.fanuc_j3);
                // this.scene.add(this.fanuc_j4);
                // this.scene.add(this.fanuc_j5);
                // this.scene.add(this.fanuc_j6);
                // this.fanuc_robot.add(this.fanuc_gltf);
                // this.fanuc_robot.add(this.base)
                // this.fanuc_robot.add(this.fanuc_j1);
                // this.fanuc_robot.add(this.fanuc_j2);
                // this.fanuc_robot.add(this.fanuc_j3);
                // this.fanuc_robot.add(this.fanuc_j4);
                // this.fanuc_robot.add(this.fanuc_j5);
                // this.fanuc_robot.add(this.fanuc_j6);
                // let j2axis = new THREE.AxesHelper( .20 );
                // let j3axis = new THREE.AxesHelper( .20 );
                // let j4axis = new THREE.AxesHelper( .20 );
                // let j5axis = new THREE.AxesHelper( .20 );
                // let j6axis = new THREE.AxesHelper( .20 );
                // console.log(this.groundPlaneContainerObj);
                // this.groundPlaneContainerObj.attach(fanuc_gltf);

                // this.fanuc_gltf.add(this.base);
                // this.base.add(this.fanuc_j1);
                // this.fanuc_j1.add(this.fanuc_j2);
                // this.fanuc_j2.add(this.fanuc_j3);
                // this.fanuc_j3.add(this.fanuc_j4);
                // this.fanuc_j4.add(this.fanuc_j5);
                // this.fanuc_j5.add(this.fanuc_j6);
                // THREE.SceneUtils.attach( this.base, this.scene, this.fanuc_gltf );
                // THREE.SceneUtils.attach( this.fanuc_j1, this.scene, this.base );
                // THREE.SceneUtils.attach( this.fanuc_j2, this.scene, this.fanuc_j1 );
                // THREE.SceneUtils.attach( this.fanuc_j3, this.scene, this.fanuc_j2 );
                // THREE.SceneUtils.attach( this.fanuc_j4, this.scene, this.fanuc_j3 );
                // THREE.SceneUtils.attach( this.fanuc_j5, this.scene, this.fanuc_j4 );
                // THREE.SceneUtils.attach( this.fanuc_j6, this.scene, this.fanuc_j5 );
                // fanuc_j1.add(j1axis);
                
                // this.reparentObject3D(this.base, this.fanuc_gltf);
                // this.reparentObject3D(this.fanuc_j1, this.base );
                // this.reparentObject3D(this.fanuc_j2, this.fanuc_j1 );
                // this.reparentObject3D(this.fanuc_j3, this.fanuc_j2 );
                // this.reparentObject3D(this.fanuc_j4, this.fanuc_j3 );
                // this.reparentObject3D(this.fanuc_j5, this.fanuc_j4 );
                // this.reparentObject3D(this.fanuc_j6, this.fanuc_j5 );

                // this.testAttach(this.base, this.fanuc_gltf);
                // this.testAttach(this.fanuc_j1, this.base );
                // this.testAttach(this.fanuc_j2, this.fanuc_j1 );
                // this.testAttach(this.fanuc_j3, this.fanuc_j2 );
                // this.testAttach(this.fanuc_j4, this.fanuc_j3 );
                // this.testAttach(this.fanuc_j5, this.fanuc_j4 );
                // this.testAttach(this.fanuc_j6, this.fanuc_j5 );
                // fanuc_j1.add(j1axis);
                // this.fanuc_j2.add(this.fanuc_j3);
                // fanuc_j2.add(j2axis);
                // this.fanuc_j3.add(this.fanuc_j4);
                // fanuc_j3.add(j3axis);
                // this.fanuc_j4.add(this.fanuc_j5);
                // fanuc_j4.add(j4axis);
                // this.fanuc_j5.add(this.fanuc_j6);
                // fanuc_j5.add(j5axis);

                // this.fanuc_gltf.scale.set(200, 200, 200);
                // this.fanuc_gltf.position.set(0,0,0);
                // this.fanuc_gltf.rotation.set(Math.PI/2, Math.PI, 0);
                this.scene.add(this.fanuc_gltf);
                this.scene.add(this.j1axis);
                this.fanuc_gltf.position.set(0,0,0);
                this.fanuc_gltf.rotation.set(0, 0, Math.PI);
                this.fanuc_gltf.scale.set(300,300,300);
                this.fanuc_gltf.visible = false;
                
                console.log(this.fanuc_gltf);
            },
            // called while loading is progressing
            function ( xhr ) {

                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

            },
            // called when loading has errors
            function ( error ) {

                console.log( error );

            }
        );

        this.firstEdit = true;

        this.activateCheckpointMode = this.activateCheckpointMode.bind(this);
        this.editCheckpoint = this.editCheckpoint.bind(this);
        this.anchorRobotToGroundPlane = this.anchorRobotToGroundPlane.bind(this);
        this.updateDevices = this.updateDevices.bind(this);
        this.clearRenderInDevices = this.clearRenderInDevices.bind(this);
        this.update = this.update.bind(this);
        this.reparentObject3D = this.reparentObject3D.bind(this);
        this.CCDIKGLTF = this.CCDIKGLTF.bind(this);
        this.clampRotation = this.clampRotation.bind(this);
        this.clamp = this.clamp.bind(this);
    }

    clamp(val, min, max) {
        if (val < min) { 
            val = min;
        }
        else if (val > max){
            val = max;
        }
        return val;
    }

    clampRotation(vec, minVal, maxVal){

        vec.x = this.clamp(vec.x, minVal, maxVal);
        vec.y = this.clamp(vec.y, minVal, maxVal);
        vec.z = this.clamp(vec.z, minVal, maxVal);

        return vec;
    }

    // clampScalar( minVal, maxVal ) {

    //     this.x = Math.max( minVal, Math.min( maxVal, this.x ) );
    //     this.y = Math.max( minVal, Math.min( maxVal, this.y ) );
    //     this.z = Math.max( minVal, Math.min( maxVal, this.z ) );

    //     return this;

    // }


    reparentObject3D(subject, newParent){
        subject.matrix.copy(subject.matrixWorld);
        subject.applyMatrix(new THREE.Matrix4().getInverse(newParent.matrixWorld));
        newParent.add(subject);
    }

    testAttach(object, subject){
        let _m1 = new THREE.Matrix4();
        subject.matrixAutoUpdate = false;

        _m1.copy(new THREE.Matrix4().getInverse(subject.matrixWorld));

        if ( object.parent !== null ) {

            object.parent.matrixAutoUpdate = false;

            _m1.multiply( object.parent.matrixWorld );

            object.parent.updateMatrix(true);

        }

        object.applyMatrix( _m1 );

        object.matrixAutoUpdate = false;;

        subject.add( object );
        object.updateMatrixWorld(true);
        subject.updateMatrixWorld(true);
        subject.matrixAutoUpdate = true;
        object.matrixAutoUpdate = true;

        return subject;

    }

    CCDIKGLTF(model, anglelims, axes, target, tolerance, steps){
        let tcp             = new THREE.Vector3();
        let targetDirection = new THREE.Vector3();
        let invQ            = new THREE.Quaternion();
        let scale_junk      = new THREE.Vector3();
        let endEffector     = model.slice(-1)[0];
        let ee              = new THREE.Vector3();
        let temp_ee         = new THREE.Vector3();
        let temp_target     = new THREE.Vector3();
        let axis            = new THREE.Vector3();
        let q               = new THREE.Quaternion();
        let ctr             = 0;
        endEffector.getWorldPosition(ee);
        let dist = distanceBetween(ee, target);
        // console.log(dist);
        while (dist > tolerance && ctr < steps){
            for (let i = model.length - 2; i >= 0; i--){
                // console.log(i);
                let curr = model[i];
                curr.updateMatrixWorld();

                let curr_axis = axes[i];
                let angles = anglelims[i];

                // curr.matrixWorld.decompose(tcp, invQ, scale_junk);
                // invQ.inverse();
                // ee.setFromMatrixPosition(endEffector.matrixWorld);

                endEffector.getWorldPosition(ee);

                temp_ee = curr.worldToLocal(ee.clone()).normalize();
                temp_target = curr.worldToLocal(target.clone()).normalize();
                let temp_q = new THREE.Quaternion(0, 0, 0, 1).setFromUnitVectors(temp_ee, temp_target);
                curr.quaternion.multiply(temp_q);

                let angle = temp_target.dot(temp_ee);
                if ( angle > 1.0 ) {
                    angle = 1.0;
                } else if ( angle < - 1.0 ) {
                    angle = - 1.0;
                }

                angle = Math.acos( angle );

                if ( angle < 1e-5 ) continue;

                if (angle < radians(angles[0])) {
                    angle = radians(angles[0]);
                }
                if (angle > radians(angles[1]) ) {
                    angle = radians(angles[1]);
                }

                axis.crossVectors( temp_ee, temp_target );
                axis.normalize();

                q.setFromAxisAngle( axis, angle );
                curr.quaternion.multiply( q );

                let invRot = curr.quaternion.clone().inverse();
                let parentAxis = curr_axis.clone().applyQuaternion(invRot);

                let fromToQuat = new THREE.Quaternion(0,0,0,1).setFromUnitVectors(curr_axis, parentAxis);

                curr.quaternion.multiply(fromToQuat); 
                // let clampedRot = curr.rotation.toVector3();
                // clampedRot = this.clampRotation(clampedRot, radians(angles[0]), radians(angles[1]));
                // curr.rotation.setFromVector3(clampedRot);
                curr.updateMatrixWorld();
            }
            ctr++;
        }
    }

    /*
    * Create a new path with first checkpoint and send path data to server
    */
    createNewPath(newPosition){

        this.currentPath = new Path(this.groundPlaneContainerObj, this.paths.length, this.checkpointbaseFloating, this.checkpointbaseGrounded, this.dummy_anchor); // We create the first path

        this.paths.push(this.currentPath);

    }

    moveSelectedCheckpoint(newPosition){

        let positionGP = new THREE.Vector3();
        positionGP.copy(newPosition);
        this.currentPath.parentContainer.worldToLocal(positionGP);

        //this.currentPath.selectedCheckpoint.position.copy(positionGP);
        this.currentPath.selectedCheckpoint.editPosition(positionGP);

        if (this.currentPath.checkpoints.length > 1){
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();

        }
        this.currentPath.updateHeightLinesAndFloorMarks();
        this.move_robot = false;
    }

    activateCheckpointMode(mode){
        if (this.currentPath !== null) this.currentPath.activateSelectedCheckpointMode(mode);
    }

    showCheckpointArrows(){
        this.currentPath.selectedCheckpoint.showPositionArrows();
    }
    hideCheckpointArrows(){
        this.currentPath.selectedCheckpoint.hidePositionArrows();
    }

    adjustPosition(mode){
        switch (mode) {
            case 0:
                // Position Right
                this.currentPath.selectedCheckpoint.position.x += 10;
                break;
            case 1:
                // Position Left
                this.currentPath.selectedCheckpoint.position.x -= 10;
                break;
            case 2:
                // Position Up
                this.currentPath.selectedCheckpoint.position.z += 10;
                break;
            case 3:
                // Position Down
                this.currentPath.selectedCheckpoint.position.z -= 10;
                break;
            default:
                break;
        }
        if (this.currentPath.checkpoints.length > 1) {
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();
            this.currentPath.updateHeightLinesAndFloorMarks();
        }
    }

    editCheckpoint(eventData, newPosition, mode){

        if (this.currentPath !== null &&
            this.currentPath.selectedCheckpoint !== null &&
            this.currentPath.selectedCheckpoint.isEditionActive()){

            this.currentPath.closeReset();  // Reset the counter in order to not show the checkpointUI when editing

            switch (mode) {
                case 1:
                    this.currentPath.selectedCheckpoint.editRotation(this.getDeltaMouse(eventData));
                    break;
                case 2:
                    this.currentPath.selectedCheckpoint.editSpeed(this.getDeltaMouse(eventData));

                    if (this.currentPath.checkpoints.length > 1){
                        this.currentPath.updateSpline();
                        this.currentPath.updateFloorSpline();
                    }
                    break;
                case 3:

                    let delta = this.getDeltaMouse(eventData);
                    let newHeight = this.currentPath.selectedCheckpoint.height + delta * 1000;  // In mm

                    if (newHeight >= 0){    // prevent from going under the surface

                        this.currentPath.selectedCheckpoint.editHeight(newHeight);

                        if (this.currentPath.checkpoints.length > 1){
                            this.currentPath.updateSpline();
                            this.currentPath.updateFloorSpline();
                        }

                        this.currentPath.updateHeightLinesAndFloorMarks();
                    }

                    break;
                default:
                    break;
            }
            this.move_robot = false;
        }
    }

    closeEdit(){
        this.firstEdit = true;
    }

    setGroundPlaneMatrix(groundPlaneMatrix, projectionMatrix){
        // only set the projection matrix for the camera 1 time, since it stays the same
        if (!this.isProjectionMatrixSet && projectionMatrix.length > 0) {
            setMatrixFromArray(this.camera.projectionMatrix, projectionMatrix);
            this.isProjectionMatrixSet = true;
        }

        if (this.isProjectionMatrixSet) {                                                // don't turn into else statement, both can happen

            setMatrixFromArray(this.groundPlaneContainerObj.matrix, groundPlaneMatrix);  // update model view matrix
            this.groundPlaneContainerObj.visible = true;

            this.update();

            if (!this.isGroundPlaneTracked) this.emit('surfaceTracked');
            this.isGroundPlaneTracked = true;
        }
    }

    renderRobot(modelviewmatrix, projectionMatrix){

        // Once the object is tracked and the frame is set to full frame, this callback keeps on getting called even if we don't see the object target.
        // This is needed to prevent from assigning a null matrix to the robot dummy
        // If this is not checked, we will get a constant warning when loosing the object target
        if (modelviewmatrix[0] !== null){

            // Update model view matrix
            setMatrixFromArray(this.robotDummy.matrix, modelviewmatrix);
            this.robotDummy.visible = true;

            this.counter++;
            if (this.counter > 100 && !this.isRobotAnchorSet && this.isGroundPlaneTracked){

                this.anchorRobotToGroundPlane();

                this.emit('robotAnchored');

                this.isRobotAnchorSet = true;
            }
        } else {
            this.robotDummy.visible = false;
        }
    }

    rotationCopy(child1, child2, parent1, parent2){
        // detach the children from their parents and add them to the scene
        THREE.SceneUtils.detach( child2, parent2, this.scene );
        THREE.SceneUtils.detach( child1, parent1, this.scene );

        // here is the tricky part: add the second parent as a child of its former child
        THREE.SceneUtils.attach( parent2, this.scene, child2 );

        // copy the first child's rotation, and make sure the matrix is updated   
        child2.quaternion.copy( child1.quaternion );
        child2.updateMatrixWorld( true );

        // detach the parent from the child and add it to the scene
        THREE.SceneUtils.detach( parent2, child2, this.scene );

        // put the children back where the were before   
        THREE.SceneUtils.attach( child2, this.scene, parent2 );
        THREE.SceneUtils.attach( child1, this.scene, parent1 );
    }

    anchorRobotToGroundPlane(){

        this.dummy_anchor = this.robotDummy.clone();

        THREE.SceneUtils.attach( this.dummy_anchor, this.scene, this.groundPlaneContainerObj ); // This will remove robot dummy from scene and anchor to ground plane

        if (this.fanuc_gltf !== undefined){

            // this.dummy_anchor.add(this.fanuc_gltf2);
            // this.setFanucPivots();

            this.dummy_anchor.add(this.fanuc_gltf);
            this.dummy_anchor.add(this.j1axis);
            this.fanuc_gltf.position.set(0,0,0);
            this.fanuc_gltf.rotation.set(0, 0, Math.PI);
            this.fanuc_gltf.scale.set(1200,1200,1200); 
            this.fanuc_array = [this.fanuc_j1, this.fanuc_j2, this.fanuc_j3, this.fanuc_j4, this.fanuc_j5, this.fanuc_j6];
            this.fanuc_gltf.visible = true;
        }
    }

    /*
    ** Method to update realtime Robot dummy in frame
    ** data that comes from server:
    **      data.x, data.y          - realtime MIR AR position
    **      data.z                  - realtime MIR AR orientation
    */
    moveDummyRobot(data){
        if (this.dummy_anchor != null){
            let newPosition = new THREE.Vector3(data.x * 1000, this.dummy_anchor.position.y , data.y * 1000);
            this.dummy_occlusion.position.set(newPosition.x, newPosition.y , newPosition.z);
            this.dummy_occlusion.rotation.set(this.dummy_occlusion.rotation.x, data.z, this.dummy_occlusion.rotation.z);
            this.dummy_occlusion.updateMatrix();
            this.motionViz.newMotionPoint(newPosition);
        }
    }

    clearRenderInDevices(){
        console.log("clear render in devices");
        if (this.pathsDevices !== null){
            this.pathsDevices.forEach(path => {
                path.checkpoints.forEach(checkpoint => { this.groundPlaneContainerObj.remove(checkpoint); });
                this.groundPlaneContainerObj.remove(path.tubeLine);
            });
        }
    }

    updateDevices(data){

        this.clearRenderInDevices();
        this.pathsDevices = [];

        data.forEach(framePath => {                                                                                     // We go through array of paths

            this.pathsDevices.push(new Path(this.groundPlaneContainerObj, framePath.index, this.checkpointbaseFloating, this.checkpointbaseGrounded, this.dummy_anchor));

            framePath.checkpoints.forEach(frameCheckpoint => {

                this.pathsDevices[framePath.index].newCheckpointInDevices(new THREE.Vector3(frameCheckpoint.posX, frameCheckpoint.posY, frameCheckpoint.posZ), frameCheckpoint.orientation);
            });
            if (framePath.checkpoints.length > 1) this.pathsDevices[framePath.index].createTubeForDevices();
        });
    }

    getDeltaMouse(eventData){

        this.mouseCoordinates(eventData);

        if (this.firstEdit){
            this.previousMouseY = this.mouse.y;
            this.firstEdit = false;
        }

        let delta = this.mouse.y - this.previousMouseY;
        this.previousMouseY = this.mouse.y;

        return delta;

    }

    getRayFromMouse(eventData){

        this.mouseCoordinates(eventData);

        //2. Set the picking ray from the camera position and mouse coordinates
        this.raycaster.setFromCamera( this.mouse, this.camera );

        return this.raycaster.ray;

    }

    computeCameraHeightFromGroundPlane(){

        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin

        let camdown = new THREE.Vector3();                                        // Normal to gp
        camdown.copy(this.groundPlaneContainerObj.up);
        camdown.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates
        camdown = camdown.multiplyScalar(-1);

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = camdown.dot(normal);
        const d = top/bottom;

        let newPosition = camdown.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return this.camera.position.distanceTo(newPosition);
    }

    computeGroundPlaneIntersection(ray){

        // Formulas for line and plane intersection
        // plane: (p - p0) . n = 0
        // line: p = dl + l0
        // d = (p0 - l0) . n / l . n

        //3. Compute intersection from ray to ground plane
        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin
        const l = ray.direction;                                  // line direction

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = l.dot(normal);
        const d = top/bottom;

        let newPosition = l.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return newPosition;
    }

    checkpointReached(idx){
        if (idx + 1 < this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
            //this.currentPath.checkpoints[idx + 1].activateNextAnimation();
        } else if (idx + 1 === this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
        }
    }

    checkpointTriggered(idx){
        this.currentPath.checkpoints[idx].activateNextAnimation();
    }

    // Sets the mouse position with a coordinate system where the center of the screen is the origin
    mouseCoordinates(eventData){

        if (eventData === 0){
            this.mouse.x = 0;
            this.mouse.y = 0;
        } else {
            //1. Sets the mouse position with a coordinate system where the center of the screen is the origin
            this.mouse.x = ( eventData.x / window.innerWidth ) * 2 - 1;
            this.mouse.y = - ( eventData.y / window.innerHeight ) * 2 + 1;
        }

    }

    update() {
        // if (this.currentPath !== null &&
        // this.currentPath.selectedCheckpoint !== null &&
        // this.currentPath.selectedCheckpoint.isEditionActive()){
        this.renderer.render(this.scene, this.camera);  // RENDER SCENE!
        if (this.move_robot && this.currentPath.checkpoints.length === 0){
            this.move_robot = false;
        }
        if (this.currentPath !== null && this.fanuc_array.length === 6 && !this.move_robot){
            if (this.currentPath.checkpoints.length !== 0) { 

                // console.log("FIRING CCD ALGO FOR CHECKPOINT");
                // console.log(this.currentPath.checkpoints[0]);
                this.CCDIKGLTF(this.fanuc_array, this.fanuc_angles, this.fanuc_axes, 
                    this.currentPath.checkpoints[0].getWorldPosition(), 10, 40);
                this.move_robot = true;
            }
        }
    }
}
