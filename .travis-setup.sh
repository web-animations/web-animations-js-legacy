#! /bin/sh

case $BROWSER in
Chrome)
	export CHROME=google-chrome-stable_current_amd64.deb
	wget https://dl.google.com/linux/direct/$CHROME
	sudo dpkg --install $CHROME || sudo apt-get -f install
	ls -l /usr/bin/google-chrome
	google-chrome --version
	;;

Firefox)
	firefox --version
	;;
esac

# FIXME: For speed we should install pip via apt-get install python-imaging
#        then copy into the virtualenv.

pip install -r .requirements --use-mirrors
