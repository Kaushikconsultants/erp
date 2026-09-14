package com.getcapacitor;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface PluginMethod {
    public static final String RETURN_VALUE = "value";
    public static final String RETURN_PROMISE = "promise";
    public static final String RETURN_CALLBACK = "callback";
    public static final String RETURN_NONE = "none";

    String returnType() default RETURN_VALUE;
}
