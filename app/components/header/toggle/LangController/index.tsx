"use client";

import { useTranslation } from "react-i18next";
import LangIcon from "~components/icon/langIcon";
import { Button } from "~components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~components/ui/dropdown-menu";
import { Languages } from "~types/translation";
import Cookies from "js-cookie";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (locale: Languages) => {
    if (locale && i18n.language === locale) return;

    i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    Cookies.set("lang", locale, { expires: 365 });
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant={"ghost"} className="w-9 shrink-9 px-0">
          <LangIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Button variant={"ghost"} onClick={() => changeLanguage("en")}>
            English
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Button variant={"ghost"} onClick={() => changeLanguage("ko")}>
            한국어
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
