import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvfalcondemo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'falcon_demo_file.py'),
    os.path.join(package_folder, 'falcon_demo_file.py'))

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'falcon_demo_mic.py'),
    os.path.join(package_folder, 'falcon_demo_mic.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvfalcondemo/LICENSE\n')
    f.write('include pvfalcondemo/falcon_demo_file.py\n')
    f.write('include pvfalcondemo/falcon_demo_mic.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvfalcondemo",
    version="1.0.1",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Falcon Speaker Diarization engine demos",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/falcon",
    packages=["pvfalcondemo"],
    install_requires=["pvfalcon==1.0.1", "pvrecorder==1.2.2", "tabulate==0.8.10"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'falcon_demo_file=pvfalcondemo.falcon_demo_file:main',
            'falcon_demo_mic=pvfalcondemo.falcon_demo_mic:main',
        ],
    ),
    python_requires='>=3.7',
    keywords="Speaker Diarization, Speaker Identification, Voice Identification",
)
