package com.example.blog.dto;

import com.example.blog.common.CurrentUser;

public record TokenValidationResponse(boolean valid, CurrentUser user) {
}
