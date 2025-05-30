#
# Copyright 2023-2024 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import shutil

import setuptools

INCLUDE_FILES = ("../../LICENSE", "__init__.py", "_factory.py", "_falcon.py", "_util.py")
INCLUDE_LIBS = ('common', 'linux', 'mac', 'raspberry-pi', 'windows')

os.system("git clean -dfx")

package_folder = os.path.join(os.path.dirname(__file__), "pvfalcon")
os.mkdir(package_folder)
manifest_in = ""

for rel_path in INCLUDE_FILES:
    shutil.copy(os.path.join(os.path.dirname(__file__), rel_path), package_folder)
    manifest_in += "include pvfalcon/%s\n" % os.path.basename(rel_path)

os.mkdir(os.path.join(package_folder, "lib"))
for platform in INCLUDE_LIBS:
    shutil.copytree(
        os.path.join(os.path.dirname(__file__), "../../lib", platform), os.path.join(package_folder, "lib", platform)
    )
manifest_in += "recursive-include pvfalcon/lib *\n"

with open(os.path.join(os.path.dirname(__file__), "MANIFEST.in"), "w") as f:
    f.write(manifest_in)

with open(os.path.join(os.path.dirname(__file__), "README.md"), "r") as f:
    long_description = f.read()

setuptools.setup(
    name="pvfalcon",
    version="1.0.4",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Falcon Speaker Diarization Engine",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/falcon",
    packages=["pvfalcon"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech",
    ],
    python_requires=">=3.9",
    keywords="Speaker Diarization, Speaker Identification, Voice Identification",
)
