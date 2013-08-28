#! /bin/bash

set -x

# Make sure /dev/shm has correct permissions.
ls -l /dev/shm
sudo chmod 1777 /dev/shm
ls -l /dev/shm

sudo apt-get update --fix-missing > /dev/null 2>&1

# Install python-imaging from the environment rather then build it.
# If the below fails, pip will build it via the requirements.txt
sudo apt-get install python-imaging
VIRTUAL_ENV_site_packages=$(echo $VIRTUAL_ENV/lib/*/site-packages)
VIRTUAL_ENV_python_version=$(echo $VIRTUAL_ENV_site_packages | sed -e's@.*/\(.*\)/site-packages@\1@')
ln -s /usr/lib/$VIRTUAL_ENV_python_version/dist-packages/PIL.pth $VIRTUAL_ENV_site_packages/PIL.pth
ln -s /usr/lib/$VIRTUAL_ENV_python_version/dist-packages/PIL $VIRTUAL_ENV_site_packages/PIL

export VERSION=$(echo $BROWSER | sed -e's/[^-]*-//')
export BROWSER=$(echo $BROWSER | sed -e's/-.*//')

echo BROWSER=$BROWSER
echo VERSION=$VERSION

case $BROWSER in
Android)
	sudo apt-get install -qq --force-yes \
		libc6:i386 libgcc1:i386 gcc-4.6-base:i386 libstdc++5:i386 \
		libstdc++6:i386 lib32z1 libreadline6-dev:i386 \
		libncurses5-dev:i386
	bash tools/android/setup.sh
	;;

Chrome)
	echo "Getting $VERSION of $BROWSER"
	export CHROME=google-chrome-${VERSION}_current_amd64.deb
	wget https://dl.google.com/linux/direct/$CHROME
	sudo dpkg --install $CHROME || sudo apt-get -f install
	which google-chrome
	ls -l `which google-chrome`
	google-chrome --version
	;;

Firefox)
	sudo rm -f /usr/local/bin/firefox
	case $VERSION in
	beta)
		yes "\n" | sudo add-apt-repository -y ppa:mozillateam/firefox-next
		;;
	aurora)
		yes "\n" | sudo add-apt-repository -y ppa:ubuntu-mozilla-daily/firefox-aurora
		;;
	esac
	sudo apt-get update --fix-missing
	sudo apt-get install firefox
	which firefox
	ls -l `which firefox`
	firefox --version
	;;
esac

R=tools/python/requirements.txt
pip install -r $R --use-mirrors || pip install -r $R
