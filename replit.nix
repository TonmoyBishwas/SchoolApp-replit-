{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.python311Packages.requests
    pkgs.sqlite
  ];
}