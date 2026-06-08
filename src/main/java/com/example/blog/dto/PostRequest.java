package com.example.blog.dto;

import java.util.List;

public record PostRequest(String title, String content, String summary, Integer status, List<String> tags) {
}
