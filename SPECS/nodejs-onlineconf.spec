# This macro is needed at the start for building on EL6
%{?nodejs_find_provides_and_requires}

%global enable_tests 0

%global npm_name onlineconf

Name:    nodejs-%{npm_name}
Version: %{__version}
Release: %{__release}%{dist}
Summary: OnlineConf client for Node.js
Group:   Development/Libraries
License: MAILRU

Requires: npm(debug)

BuildRequires: nodejs-devel
BuildRequires: nodejs-packaging

BuildRoot:     %{_tmppath}/%{name}-%{?version}-%{?release}-buildroot
BuildArch:     noarch
ExclusiveArch: %{nodejs_arches} noarch

%description
OnlineConf client for Node.js

%prep
%setup -n nodejs/onlineconf

%build
%nodejs_symlink_deps --build

%install
mkdir -p %{buildroot}%{nodejs_sitelib}/%{npm_name}
cp -rp onlineconf.js package.json %{buildroot}/%{nodejs_sitelib}/%{npm_name}
%nodejs_symlink_deps

%check
%if 0%{?enable_tests}
%nodejs_symlink_deps --check
%endif

%files
%{nodejs_sitelib}/%{npm_name}/

%changelog
* Tue Feb 10 2015 Aleksey Mashanov <a.mashanov@corp.mail.ru>
- Initial packaging
