package com.example.blog.controller;

import com.example.blog.common.ApiResponse;
import com.example.blog.dto.PostRequest;
import com.example.blog.entity.Post;
import com.example.blog.security.SecurityUtils;
import com.example.blog.service.PostService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ApiResponse<List<Post>> listPublished() {
        return ApiResponse.ok(postService.listPublished());
    }

    @GetMapping("/{id}")
    public ApiResponse<Post> getPublished(@PathVariable Long id) {
        return ApiResponse.ok(postService.getPublished(id));
    }

    @GetMapping("/mine")
    public ApiResponse<List<Post>> listMine() {
        return ApiResponse.ok(postService.listMine(SecurityUtils.currentUser()));
    }

    @PostMapping
    public ApiResponse<Post> create(@RequestBody PostRequest request) {
        return ApiResponse.ok("文章创建成功", postService.create(request, SecurityUtils.currentUser()));
    }

    @PutMapping("/{id}")
    public ApiResponse<Post> update(@PathVariable Long id, @RequestBody PostRequest request) {
        return ApiResponse.ok("文章更新成功", postService.update(id, request, SecurityUtils.currentUser()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        postService.delete(id, SecurityUtils.currentUser());
        return ApiResponse.ok("文章删除成功", null);
    }
}
