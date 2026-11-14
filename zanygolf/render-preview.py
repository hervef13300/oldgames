"""Offline model render, not a browser screenshot.
Run: blender -b --python zanygolf/render-preview.py -- course.glb preview.png
"""
import bpy
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
scene = bpy.context.scene
scene.camera = next(o for o in scene.objects if o.type == 'CAMERA')
scene.camera.data.ortho_scale = 900 * 1200 / 740
for obj in list(scene.objects):
    if obj.type == 'LIGHT':
        bpy.data.objects.remove(obj, do_unlink=True)

def sunlight(name, position, energy, color, angle):
    data = bpy.data.lights.new(name, 'SUN')
    data.energy, data.color, data.angle = energy, color, angle
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector((440, -260, 35)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

sunlight('Warm daylight', (-350, -700, 1300), 2.7, (1, .88, .7), .09)
sunlight('Cool fill', (900, 600, 400), .65, (.7, .84, 1), .3)
scene.world = bpy.data.worlds.new('Sky')
scene.world.use_nodes = True
background = scene.world.node_tree.nodes['Background']
background.inputs[0].default_value = (.68, .78, .86, 1)
background.inputs[1].default_value = .55
scene.render.engine = 'CYCLES'
scene.cycles.samples = 96
scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = 1200, 740
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = args[1]
bpy.ops.render.render(write_still=True)
