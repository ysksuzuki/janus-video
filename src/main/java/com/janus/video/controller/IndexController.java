package com.janus.video.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class IndexController {

    @RequestMapping(value = "/", method = RequestMethod.GET)
    public String showTopPage() {
        return "index";
    }

    @RequestMapping(value = "/hello", method = RequestMethod.GET)
    public String showHelloPage() {
        return "hello";
    }

    @RequestMapping(value = "/notepad", method = RequestMethod.GET)
    public String showNotepadPage() {
        return "notepad";
    }
}
